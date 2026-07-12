#!/usr/bin/env python3.13
"""
Synthegy ORD + ADMET helper script.

Runs as a subprocess from the Bun service. Reads a JSON command from stdin,
writes a JSON result to stdout. Three modes:

  {"mode": "list_datasets"}                          → list available ORD dataset IDs
  {"mode": "fetch_dataset", "datasetId": "..."}      → fetch + parse a dataset, return reactions
  {"mode": "search_reactions", "smiles": "...", "limit": 10}
                                                     → search across curated datasets for
                                                       reactions whose product matches the
                                                       given SMILES (or contains it as substructure)
  {"mode": "admet", "smiles": "..."}                 → compute Lipinski/Veber/BBB/PAINS-fragment
                                                       alerts + extra descriptors via RDKit
"""

import sys
import json
import gzip
import urllib.request
import io
from typing import Any

# ord_schema + rdkit are installed via pip --user for python3.13.
# Import lazily so the script fails gracefully if deps are missing.
def _import_ord():
    from ord_schema.proto import dataset_pb2
    return dataset_pb2

def _import_rdkit():
    from rdkit import Chem
    from rdkit.Chem import Descriptors, Crippen, Lipinski, rdMolDescriptors
    return Chem, Descriptors, Crippen, Lipinski, rdMolDescriptors


# Curated list of ORD datasets to search across. Verified to parse + contain
# product SMILES. Covers Buchwald-Hartwig, heterogeneous catalysis, tramadol
# derivatives, and diverse medicinal-chemistry reactions.
# Full list: https://github.com/Open-Reaction-Database/ord-data
CURATED_DATASETS = [
    "ord_dataset-00005539a1e04c809a9a78647bea649c",  # 750 AstraZeneca Buchwald-Hartwig aminations
    "ord_dataset-018fd0e1351f4fd09b20fcddd97b4c7a",  # 2997 reactions (diverse)
    "ord_dataset-01dbb772c5e249108f0b191ed17a2c0c",  # 1120 reactions
    "ord_dataset-0387783899c642a8b7eb4ba379bcdf5d",  # 5421 reactions incl. tramadol N-oxide
    "ord_dataset-03ba810b7f464a06b5d8787af2e8b64e",  # 9362 reactions (large diverse set)
    "ord_dataset-04982f13ed08448d93df6794846500f3",  # 1264 reactions incl. D-glucosamine
]

HF_BASE = "https://huggingface.co/datasets/open-reaction-database/ord-data/resolve/main/data"


def fetch_dataset(dataset_id: str) -> list[dict]:
    """Download a .pb.gz from Hugging Face and parse it into a list of reaction dicts."""
    # Dataset IDs are grouped into folders by their first 2 chars.
    prefix = dataset_id[len("ord_dataset-") :][:2]
    url = f"{HF_BASE}/{prefix}/{dataset_id}.pb.gz"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/octet-stream"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
    except Exception as e:
        return [{"error": f"fetch failed: {e}"}]

    try:
        dataset_pb2 = _import_ord()
        with gzip.open(io.BytesIO(data), "rb") as f:
            pb_data = f.read()
        ds = dataset_pb2.Dataset()
        ds.ParseFromString(pb_data)
    except Exception as e:
        return [{"error": f"parse failed: {e}"}]

    reactions = []
    for r in ds.reactions:
        rec: dict[str, Any] = {
            "reactionId": r.reaction_id,
            "datasetId": dataset_id,
            "datasetName": ds.name,
        }
        # Inputs (reactants, reagents, solvents, catalysts)
        inputs = []
        for name, inp in r.inputs.items():
            for comp in inp.components:
                smiles = ""
                for ident in comp.identifiers:
                    if ident.type in (2, 1, 6):  # SMILES, INCHI, MOLBLOCK
                        smiles = ident.value
                        break
                if smiles:
                    inputs.append({
                        "role": name,
                        "smiles": smiles,
                        "amountMoles": None,
                    })
        rec["inputs"] = inputs

        # Products
        products = []
        if r.outcomes:
            for prod in r.outcomes[0].products:
                smiles = ""
                for ident in prod.identifiers:
                    if ident.type in (2, 1, 6):
                        smiles = ident.value
                        break
                if smiles:
                    products.append({"smiles": smiles})
        rec["products"] = products

        # Yield (if any)
        if r.outcomes and r.outcomes[0].analyses:
            for analysis in r.outcomes[0].analyses.values():
                if analysis.HasField("raw_data") and "%" in analysis.raw_data:
                    rec["yieldRaw"] = analysis.raw_data[:100]
                    break

        # Conditions (temperature, solvents) — wrapped in try/except because
        # the proto schema has nested oneof fields that can be tricky.
        try:
            if r.conditions.temperature and r.conditions.temperature.control:
                tc = r.conditions.temperature.control
                if tc.value:
                    rec["temperature"] = f"{tc.value.value} {tc.value.units}"
        except Exception:
            pass
        try:
            if r.conditions.solvents:
                rec["solvents"] = []
                for sv in r.conditions.solvents:
                    for comp in sv.components:
                        for ident in comp.identifiers:
                            if ident.type == 2:
                                rec["solvents"].append(ident.value)
        except Exception:
            pass

        reactions.append(rec)
    return reactions


def search_reactions(smiles: str, limit: int = 10) -> dict:
    """Search curated ORD datasets for reactions whose product matches the SMILES."""
    Chem, Descriptors, Crippen, Lipinski, rdMolDescriptors = _import_rdkit()
    query_mol = Chem.MolFromSmiles(smiles)
    if query_mol is None:
        return {"error": f"invalid SMILES: {smiles}"}
    query_smarts = Chem.MolToSmarts(query_mol)

    matches: list[dict] = []
    datasets_searched = 0
    for ds_id in CURATED_DATASETS:
        try:
            reactions = fetch_dataset(ds_id)
            if not reactions or "error" in reactions[0]:
                continue
            datasets_searched += 1
            for r in reactions:
                for prod in r.get("products", []):
                    try:
                        prod_mol = Chem.MolFromSmiles(prod["smiles"])
                        if prod_mol and prod_mol.HasSubstructMatch(query_mol):
                            r["matchType"] = "exact_substructure"
                            r["querySmiles"] = smiles
                            matches.append(r)
                            if len(matches) >= limit:
                                return {
                                    "query": smiles,
                                    "datasetsSearched": datasets_searched,
                                    "totalMatches": len(matches),
                                    "reactions": matches,
                                }
                            break
                    except Exception:
                        continue
        except Exception:
            continue
    return {
        "query": smiles,
        "datasetsSearched": datasets_searched,
        "totalMatches": len(matches),
        "reactions": matches,
    }


def compute_admet(smiles: str) -> dict:
    """Compute ADMET-relevant descriptors and rule-based predictions."""
    Chem, Descriptors, Crippen, Lipinski, rdMolDescriptors = _import_rdkit()
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return {"error": f"invalid SMILES: {smiles}"}

    mw = Descriptors.MolWt(mol)
    logp = Crippen.MolLogP(mol)
    tpsa = Descriptors.TPSA(mol)
    hbd = Lipinski.NumHDonors(mol)
    hba = Lipinski.NumHAcceptors(mol)
    rotb = Lipinski.NumRotatableBonds(mol)
    heavy = mol.GetNumHeavyAtoms()
    rings = rdMolDescriptors.CalcNumRings(mol)
    arom_rings = rdMolDescriptors.CalcNumAromaticRings(mol)
    charge = Chem.GetFormalCharge(mol)

    # Rule of 5 (Lipinski)
    lipinski_violations = sum([
        mw > 500,
        logp > 5,
        hbd > 5,
        hba > 10,
    ])
    lipinski_pass = lipinski_violations == 0

    # Veber (oral bioavailability): rotatable bonds <= 10 AND TPSA <= 140
    veber_pass = rotb <= 10 and tpsa <= 140

    # BBB permeability (Pajouhesh & Lenz): MW<400, logP 1-3, TPSA<90, HBD<=1
    bbb_pass = mw < 400 and 1 <= logp <= 3 and tpsa < 90 and hbd <= 1

    # Lead-likeness: 200 <= MW <= 350, logP <= 3
    lead_like = 200 <= mw <= 350 and logp <= 3

    # Fragment-likeness: MW <= 300, rings <= 3, rotB <= 3, HBD+HBA <= 6
    fragment_like = mw <= 300 and rings <= 3 and rotb <= 3 and (hbd + hba) <= 6

    # PAINS-like alerts (simplified — checks for known problematic substructures)
    # This is a small subset; a full PAINS filter needs the RDKit PAINS filter.
    pains_smarts = {
        "rhodanine": "[#7]1C(=O)NC(=S)C1=O",
        "keto_enol": "C=C-O",
        "ene_lactam": "C=CC(=O)N",
    }
    pains_alerts = []
    for name, sma in pains_smarts.items():
        patt = Chem.MolFromSmarts(sma)
        if patt and mol.HasSubstructMatch(patt):
            pains_alerts.append(name)

    # Synthetic accessibility heuristic (lower = easier to synthesise)
    # Based on Bertz complexity + ring count + stereocenters
    stereocenters = len(Chem.FindMolChiralCenters(mol, includeUnassigned=True))
    sa_score = max(1, min(10, 1 + rings + arom_rings + stereocenters + (1 if logp > 4 else 0)))

    # Drug-likeness score (0-1) — weighted combination
    drug_score = 0.0
    if lipinski_pass: drug_score += 0.3
    if veber_pass: drug_score += 0.2
    if not pains_alerts: drug_score += 0.2
    if mw <= 450: drug_score += 0.15
    if -1 <= logp <= 4: drug_score += 0.15

    return {
        "smiles": smiles,
        "descriptors": {
            "molecularWeight": round(mw, 2),
            "clogP": round(logp, 2),
            "tpsa": round(tpsa, 2),
            "hBondDonors": hbd,
            "hBondAcceptors": hba,
            "rotatableBonds": rotb,
            "heavyAtoms": heavy,
            "rings": rings,
            "aromaticRings": arom_rings,
            "formalCharge": charge,
            "stereoCenters": stereocenters,
        },
        "rules": {
            "lipinski": {
                "pass": lipinski_pass,
                "violations": lipinski_violations,
                "note": "MW<=500, logP<=5, HBD<=5, HBA<=10" if lipinski_pass else f"{lipinski_violations} violation(s)",
            },
            "veber": {
                "pass": veber_pass,
                "note": "rotB<=10 AND TPSA<=140" if veber_pass else "fails oral bioavailability",
            },
            "bbbPermeable": {
                "pass": bbb_pass,
                "note": "MW<400, logP 1-3, TPSA<90, HBD<=1" if bbb_pass else "unlikely to cross BBB",
            },
            "leadLike": {"pass": lead_like, "note": "200<=MW<=350, logP<=3"},
            "fragmentLike": {"pass": fragment_like, "note": "MW<=300, rings<=3, rotB<=3, HBD+HBA<=6"},
        },
        "alerts": {
            "pains": pains_alerts,
            "syntheticAccessibility": sa_score,  # 1-10, higher = harder
        },
        "drugLikenessScore": round(drug_score, 2),
        "verdict": (
            "excellent" if drug_score >= 0.85 else
            "good" if drug_score >= 0.65 else
            "marginal" if drug_score >= 0.45 else
            "poor"
        ),
    }


def main():
    cmd = json.loads(sys.stdin.read())
    mode = cmd.get("mode")
    if mode == "list_datasets":
        result = {"datasets": CURATED_DATASETS}
    elif mode == "fetch_dataset":
        result = {"reactions": fetch_dataset(cmd["datasetId"])}
    elif mode == "search_reactions":
        result = search_reactions(cmd["smiles"], cmd.get("limit", 10))
    elif mode == "admet":
        result = compute_admet(cmd["smiles"])
    else:
        result = {"error": f"unknown mode: {mode}"}
    sys.stdout.write(json.dumps(result, default=str))
    sys.stdout.flush()


if __name__ == "__main__":
    main()

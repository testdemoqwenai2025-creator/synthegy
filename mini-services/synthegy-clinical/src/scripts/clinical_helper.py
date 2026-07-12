#!/usr/bin/env python3.13
"""
Synthegy clinical data helper — government data + outcome prediction + CDISC export.

Modes:
  {"mode": "gov_data", "disease": "rheumatoid_arthritis"}  → fetch real government data (WHO + FDA)
  {"mode": "predict_outcome", "patient": {...}}             → predict remission probability
  {"mode": "predict_cohort", "patients": [...]}             → batch predictions
  {"mode": "cdisc_sdtm", "patients": [...]}                 → CDISC SDTM-formatted export
  {"mode": "compound_disease_match", "targets": [...], "diseases": [...]}  → match compounds to diseases
"""

import json
import sys
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

# =========================================================================
# Government data integration (WHO GHO + openFDA)
# =========================================================================

WHO_BASE = "https://ghoapi.azureedge.net/api"
FDA_BASE = "https://api.fda.gov/drug"

# Map our disease keys to WHO indicator codes + FDA drug names
DISEASE_TO_WHO = {
    "rheumatoid_arthritis": {"who_indicators": ["WHS2_161"], "fda_drugs": ["methotrexate", "adalimumab", "etanercept", "infliximab", "tofacitinib"]},
    "migraine": {"who_indicators": [], "fda_drugs": ["sumatriptan", "rizatriptan", "topiramate", "onabotulinumtoxina", "erenumab"]},
    "gout": {"who_indicators": [], "fda_drugs": ["allopurinol", "febuxostat", "colchicine", "probenecid", "pegloticase"]},
    "osteoarthritis": {"who_indicators": [], "fda_drugs": ["acetaminophen", "ibuprofen", "naproxen", "celecoxib", "duloxetine"]},
    "ulcerative_colitis": {"who_indicators": [], "fda_drugs": ["mesalamine", "infliximab", "adalimumab", "vedolizumab", "ustekinumab"]},
    "asthma": {"who_indicators": ["WHS2_161"], "fda_drugs": ["albuterol", "fluticasone", "budesonide", "montelukast", "omalizumab", "dupilumab"]},
}


def fetch_json(url, timeout=15):
    """Fetch JSON from a URL with error handling."""
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "url": url}
    except Exception as e:
        return {"error": str(e)}


def fetch_gov_data(disease_key):
    """Fetch real government data for a disease from WHO + FDA."""
    mapping = DISEASE_TO_WHO.get(disease_key, {})
    result = {
        "disease": disease_key,
        "who_data": [],
        "fda_adverse_events": [],
        "fda_drug_labels": [],
        "data_sources": [],
        "null_fields": [],
    }

    # 1. WHO Global Health Observatory data
    who_indicators = mapping.get("who_indicators", [])
    if who_indicators:
        for indicator_code in who_indicators:
            url = f"{WHO_BASE}/{indicator_code}?$filter=Dim1 eq 'BOTHSEX' and TimeDim ge 2010&$top=5"
            data = fetch_json(url)
            if isinstance(data, dict) and "value" in data:
                for v in data["value"][:3]:
                    result["who_data"].append({
                        "indicator": indicator_code,
                        "country": v.get("SpatialDim", "Unknown"),
                        "year": v.get("TimeDim", "Unknown"),
                        "value": v.get("NumericValue", "Null"),
                        "unit": v.get("Measure", "Unknown"),
                    })
                result["data_sources"].append(f"WHO GHO: {indicator_code}")
            else:
                result["null_fields"].append(f"WHO {indicator_code}: no data")
    else:
        result["null_fields"].append(f"WHO: no specific indicators for {disease_key}")

    # 2. FDA adverse event counts for each drug
    fda_drugs = mapping.get("fda_drugs", [])
    for drug in fda_drugs[:5]:  # limit to 5 drugs
        url = f"{FDA_BASE}/event.json?search=patient.drug.medicinalproduct:%22{urllib.parse.quote(drug)}%22&limit=1"
        data = fetch_json(url)
        if isinstance(data, dict) and "meta" in data:
            total = data["meta"].get("results", {}).get("total", 0)
            # Fetch top reactions
            url2 = f"{FDA_BASE}/event.json?search=patient.drug.medicinalproduct:%22{urllib.parse.quote(drug)}%22&count=patient.reaction.reactionmeddrapt.exact&limit=5"
            data2 = fetch_json(url2)
            top_reactions = []
            if isinstance(data2, dict) and "results" in data2:
                for r in data2["results"][:3]:
                    top_reactions.append({"reaction": r.get("term", "Unknown"), "count": r.get("count", 0)})
            result["fda_adverse_events"].append({
                "drug": drug,
                "totalAdverseEvents": total,
                "topReactions": top_reactions,
            })
        else:
            result["fda_adverse_events"].append({"drug": drug, "totalAdverseEvents": "Null", "topReactions": []})
            result["null_fields"].append(f"FDA adverse events: no data for {drug}")
        result["data_sources"].append(f"openFDA: {drug}")

    # 3. FDA drug labeling (indications)
    for drug in fda_drugs[:3]:
        url = f"{FDA_BASE}/label.json?search=openfda.generic_name:%22{urllib.parse.quote(drug)}%22&limit=1"
        data = fetch_json(url)
        if isinstance(data, dict) and "results" in data and data["results"]:
            r = data["results"][0]
            indications = r.get("indications_and_usage", ["Null"])
            result["fda_drug_labels"].append({
                "drug": drug,
                "indications": indications[0][:200] if isinstance(indications, list) and indications else "Null",
                "warnings": (r.get("warnings_and_precautions", ["Null"])[0] if isinstance(r.get("warnings_and_precautions"), list) and r.get("warnings_and_precautions") else "Null")[:200],
            })
        else:
            result["fda_drug_labels"].append({"drug": drug, "indications": "Null", "warnings": "Null"})
            result["null_fields"].append(f"FDA label: no data for {drug}")

    result["totalGovRecords"] = len(result["who_data"]) + sum(1 for ae in result["fda_adverse_events"] if ae.get("totalAdverseEvents") != "Null") + len(result["fda_drug_labels"])
    return result


# =========================================================================
# Outcome prediction (simple logistic regression heuristic)
# =========================================================================

def predict_outcome(patient):
    """Predict remission probability based on biomarkers + treatment history."""
    # Simple heuristic model based on known RA/asthma/etc. predictors
    score = 0.5  # baseline

    # Younger age → better prognosis
    age = patient.get("ageAtOnset", 50)
    if age < 40: score += 0.10
    elif age < 60: score += 0.05
    elif age > 70: score -= 0.10

    # Female sex → slightly better for some diseases
    if patient.get("sex") == "F": score += 0.03

    # Non-smoker → better
    if not patient.get("smoker"): score += 0.07

    # Biologic in treatment history → better outcomes
    treatments = patient.get("treatments", [])
    has_biologic = any(t.get("class") == "Biologic" for t in treatments)
    if has_biologic: score += 0.08

    # Has advanced therapy → better
    has_advanced = any(t.get("class") == "Advanced" for t in treatments)
    if has_advanced: score += 0.05

    # Recent diagnosis year → better (modern treatments)
    dx_year = patient.get("diagnosisYear", 2000)
    if dx_year >= 2015: score += 0.10
    elif dx_year >= 2005: score += 0.05
    elif dx_year < 1990: score -= 0.10  # pre-modern treatment era

    # Low BMI → better
    bmi = patient.get("bmi", 27)
    if bmi < 25: score += 0.03
    elif bmi > 35: score -= 0.05

    # Early treatment (startMonth < 3) → better
    if treatments and treatments[0].get("startMonth", 99) < 3:
        score += 0.04

    # Clamp 0-1
    prob = max(0.05, min(0.95, score))
    prediction = "remission_likely" if prob > 0.45 else ("lda_likely" if prob > 0.30 else "moderate_or_high")

    return {
        "patientId": patient.get("patientId", "Unknown"),
        "remissionProbability": round(prob, 3),
        "prediction": prediction,
        "confidence": "high" if abs(prob - 0.5) > 0.2 else "medium",
        "factors": {
            "age": f"{'good' if age < 40 else 'moderate' if age < 60 else 'poor'} ({age}y)",
            "smoker": "risk factor" if patient.get("smoker") else "no risk",
            "treatmentIntensity": f"{'biologic' if has_biologic else 'standard'} {'+ advanced' if has_advanced else ''}",
            "era": f"{'modern' if dx_year >= 2015 else 'transitional' if dx_year >= 2005 else 'legacy'}",
        },
    }


def predict_cohort(patients):
    """Batch predict outcomes for a cohort."""
    predictions = [predict_outcome(p) for p in patients]
    remission_probs = [p["remissionProbability"] for p in predictions]
    return {
        "totalPredicted": len(predictions),
        "meanRemissionProb": round(sum(remission_probs) / max(1, len(remission_probs)), 3),
        "highConfidenceCount": sum(1 for p in predictions if p["confidence"] == "high"),
        "predictions": predictions,
    }


# =========================================================================
# CDISC SDTM export
# =========================================================================

def export_cdisc_sdtm(patients):
    """Export patient data in CDISC SDTM-compatible format (DM + AE + VS domains)."""
    # DM domain (Demographics)
    dm_records = []
    ae_records = []
    vs_records = []
    ts_records = []  # Treatment Summary

    for p in patients:
        # DM domain
        dm_records.append({
            "STUDYID": "SYNTHEGY001",
            "DOMAIN": "DM",
            "USUBJID": p["patientId"],
            "RFICDTC": str(p["diagnosisYear"]) + "-01-01",
            "RFSTDTC": str(p["diagnosisYear"]) + "-01-01",
            "AGE": p["ageAtOnset"],
            "AGEU": "YEARS",
            "SEX": p["sex"],
            "RACE": p.get("ethnicity", "UNKNOWN"),
            "ARM": "TREATMENT",
            "ARMCD": "TRT",
            "COUNTRY": "USA",
        })

        # AE domain (Adverse Events)
        for ae in p.get("adverseEvents", []):
            ae_records.append({
                "STUDYID": "SYNTHEGY001",
                "DOMAIN": "AE",
                "USUBJID": p["patientId"],
                "AESEQ": len(ae_records) + 1,
                "AETERM": ae,
                "AESEV": "SERIOUS" if "serious" in ae.lower() or "malignancy" in ae.lower() or "cardiovascular" in ae.lower() else "MILD",
            })

        # VS domain (Vital Signs / disease scores)
        dx = p.get("biomarkers", {})
        vs_records.append({
            "STUDYID": "SYNTHEGY001",
            "DOMAIN": "VS",
            "USUBJID": p["patientId"],
            "VSSEQ": len(vs_records) + 1,
            "VSTEST": p.get("primaryMetric", "DAS28"),
            "VSORRES": str(p.get("primaryScoreAtDx", "Null")),
            "VSBLFL": "Y",  # baseline flag
        })

    return {
        "studyId": "SYNTHEGY001",
        "studyTitle": "Synthegy Synthetic Cohort — CDISC SDTM Export",
        "domains": {
            "DM": {"description": "Demographics", "recordCount": len(dm_records), "records": dm_records[:10]},
            "AE": {"description": "Adverse Events", "recordCount": len(ae_records), "records": ae_records[:10]},
            "VS": {"description": "Vital Signs / Disease Scores", "recordCount": len(vs_records), "records": vs_records[:10]},
        },
        "totalRecords": len(dm_records) + len(ae_records) + len(vs_records),
        "format": "CDISC SDTM IG 3.2",
        "disclaimer": "ALL DATA IS SYNTHETIC. For pipeline demonstration only.",
        "exportDate": datetime.now().isoformat(),
    }


# =========================================================================
# Compound-disease matching
# =========================================================================

def compound_disease_match(targets, diseases):
    """Match compound targets to disease cohorts.
    
    targets: list of { chemblId, name, geneSymbol }
    diseases: list of disease keys (e.g. ["rheumatoid_arthritis", "migraine"])
    
    Returns: which targets are relevant to which diseases.
    """
    # Our disease-to-target mapping
    DISEASE_TARGETS = {
        "rheumatoid_arthritis": ["PTGS2", "TNF", "IL6", "JAK1", "JAK2"],
        "migraine": ["HTR1B", "HTR1D", "CALCA", "CGRP"],
        "gout": ["URAT1", "XDH", "IL1B"],
        "osteoarthritis": ["PTGS2", "NGF"],
        "ulcerative_colitis": ["TNF", "IL12B", "IL23A", "JAK1"],
        "asthma": ["PTGS2", "IL4", "IL5", "IL13", "TSLP", "IgE"],
    }

    matches = []
    for target in targets:
        gene = target.get("geneSymbol", "").upper()
        if not gene:
            # Try to extract from name
            name = target.get("name", "").upper()
            for disease, disease_targets in DISEASE_TARGETS.items():
                for dt in disease_targets:
                    if dt in name:
                        gene = dt
                        break

        for disease_key in diseases:
            disease_targets = DISEASE_TARGETS.get(disease_key, [])
            relevance = 0
            if gene in disease_targets:
                relevance = 1.0  # exact match
            else:
                # Check for partial matches (e.g. "COX" matches "PTGS2")
                aliases = {"COX": "PTGS2", "COX-2": "PTGS2", "CYCLOOXYGENASE": "PTGS2",
                           "TNF-ALPHA": "TNF", "TNFα": "TNF"}
                for alias, real_gene in aliases.items():
                    if alias in gene and real_gene in disease_targets:
                        relevance = 0.7
                        break

            if relevance > 0:
                disease_name = disease_key.replace("_", " ").title()
                matches.append({
                    "target": target.get("name", gene),
                    "geneSymbol": gene,
                    "chemblId": target.get("chemblId", ""),
                    "disease": disease_name,
                    "diseaseKey": disease_key,
                    "relevanceScore": relevance,
                    "interpretation": f"Compound targets {gene}, which is a known therapeutic target for {disease_name}" if relevance == 1.0 else f"Compound may be relevant to {disease_name} via {gene}",
                })

    # Sort by relevance
    matches.sort(key=lambda m: m["relevanceScore"], reverse=True)
    return {
        "totalMatches": len(matches),
        "matches": matches,
        "diseasesWithMatch": list(set(m["diseaseKey"] for m in matches)),
    }


# =========================================================================
# CLI
# =========================================================================

def main():
    cmd = json.loads(sys.stdin.read())
    mode = cmd.get("mode")

    if mode == "gov_data":
        result = fetch_gov_data(cmd.get("disease", "rheumatoid_arthritis"))
    elif mode == "predict_outcome":
        result = predict_outcome(cmd.get("patient", {}))
    elif mode == "predict_cohort":
        result = predict_cohort(cmd.get("patients", []))
    elif mode == "cdisc_sdtm":
        result = export_cdisc_sdtm(cmd.get("patients", []))
    elif mode == "compound_disease_match":
        result = compound_disease_match(cmd.get("targets", []), cmd.get("diseases", []))
    else:
        result = {"error": f"unknown mode: {mode}"}

    sys.stdout.write(json.dumps(result, default=str))
    sys.stdout.flush()


if __name__ == "__main__":
    main()

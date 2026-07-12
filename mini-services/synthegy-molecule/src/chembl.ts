// ChEMBL REST API client.
//
// ChEMBL is a free, open database of bioactive drug-like small molecules
// maintained by the European Bioinformatics Institute (EBI).
// API docs: https://chembl.gitbook.io/chembl-interface-documentation/web-services
//
// We use it to look up:
//   - The ChEMBL ID for a compound given its InChIKey
//   - The compound's drug-development metadata (max phase, first approval, ATC codes)
//   - The mechanism of action (e.g. "Cyclooxygenase inhibitor")
//   - Bioactivity measurements (IC50, Ki, Kd, EC50) against named targets
//
// The link between PubChem and ChEMBL is the InChIKey — a unique,
// canonical, hashed identifier for a chemical structure.

const CHEMBL_BASE = "https://www.ebi.ac.uk/chembl/api/data";

// --- Types ----------------------------------------------------------------

export interface ChEMBLMolecule {
  chemblId: string;
  prefName: string | null;
  maxPhase: number | null;        // 0=unknown, 1=preclinical, 4=approved
  firstApproval: number | null;   // year, e.g. 1950 for Aspirin
  atcCodes: string[];             // Anatomical Therapeutic Chemical classification
  molecularWeight: number | null;
  alogp: number | null;           // ChEMBL's own calculated logP
  psa: number | null;             // polar surface area
  ruleOfFive: number | null;      // Lipinski violations (0 = passes)
  withdrawalFlag: boolean;
  blackBoxWarning: boolean;
  chemblUrl: string;
}

export interface ChEMBLMechanism {
  chemblId: string;
  actionType: string | null;       // "INHIBITOR", "ANTAGONIST", "AGONIST", etc.
  mechanismOfAction: string;       // human-readable, e.g. "Cyclooxygenase inhibitor"
  targetType: string | null;
  directInteraction: boolean;
}

export interface ChEMBLActivity {
  activityId: number;
  standardType: string;            // "IC50", "Ki", "Kd", "EC50", etc.
  standardValue: number | null;
  standardUnits: string | null;    // "nM", "uM", etc.
  relation: string;                // "=", ">", "<", ">=", "<="
  targetName: string | null;
  targetOrganism: string | null;
  assayDescription: string | null;
  pChemblValue: number | null;     // -log10(IC50 in M), useful for ranking
  journal: string | null;
  year: number | null;
}

export interface ChEMBLBioactivity {
  molecule: ChEMBLMolecule | null;
  mechanisms: ChEMBLMechanism[];
  activities: ChEMBLActivity[];
  totalActivities: number;
  fetchedAt: number;
}

// --- Fetch helper ---------------------------------------------------------

const CHEMBL_HEADERS = {
  Accept: "application/json",
  "User-Agent": "synthegy-molecule/1.0 (contact: demo)",
};

async function chemblFetch<T>(path: string): Promise<T | null> {
  const url = path.startsWith("http") ? path : `${CHEMBL_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: CHEMBL_HEADERS });
  } catch (err) {
    throw new Error(
      `ChEMBL fetch failed: ${err instanceof Error ? err.message : "network error"}`
    );
  }
  if (res.status === 404) return null;
  if (res.status === 429) {
    // rate-limited — wait and retry once
    await new Promise((r) => setTimeout(r, 1200));
    return chemblFetch<T>(path);
  }
  if (!res.ok) {
    throw new Error(`ChEMBL returned ${res.status} for ${path}`);
  }
  return (await res.json()) as T;
}

// --- Lookup by InChIKey ---------------------------------------------------

interface ChEMBLMoleculeResponse {
  molecules?: Array<{
    molecule_chembl_id?: string;
    pref_name?: string | null;
    max_phase?: number;
    first_approval?: number | null;
    atc_classifications?: string[];
    molecule_properties?: {
      full_mwt?: string;
      alogp?: string;
      psa?: string;
      num_lip_ro5_violations?: number;
    } | null;
    withdraw_flag?: boolean;
    black_box_warning?: number;
  }>;
}

// ChEMBL's molecule endpoint can be queried by InChIKey via the
// connectivity layer (first 14 chars) to catch stereo-variant matches.
export async function lookupMoleculeByInChIKey(
  inChIKey: string
): Promise<ChEMBLMolecule | null> {
  if (!inChIKey) return null;
  // Use the full InChIKey — ChEMBL indexes it as standard_inchi_key.
  const path = `/molecule/${encodeURIComponent(inChIKey)}.json`;
  const data = await chemblFetch<ChEMBLMoleculeResponse["molecules"] extends Array<infer T> ? { molecule: T } : never>(path);
  if (!data) return null;

  // The /molecule/{inchikey}.json endpoint returns a single molecule object
  // wrapped as { molecule: {...} } OR as the molecule object directly.
  // Handle both shapes.
  const m = (data as { molecule?: ChEMBLMoleculeResponse["molecules"] extends Array<infer T> ? T : never })
    .molecule ?? (data as unknown as ChEMBLMoleculeResponse["molecules"] extends Array<infer T> ? T : never);
  if (!m || !m.molecule_chembl_id) return null;

  return {
    chemblId: m.molecule_chembl_id,
    prefName: m.pref_name ?? null,
    maxPhase: typeof m.max_phase === "number" ? m.max_phase : null,
    firstApproval: m.first_approval ?? null,
    atcCodes: m.atc_classifications ?? [],
    molecularWeight: m.molecule_properties?.full_mwt ? Number(m.molecule_properties.full_mwt) : null,
    alogp: m.molecule_properties?.alogp ? Number(m.molecule_properties.alogp) : null,
    psa: m.molecule_properties?.psa ? Number(m.molecule_properties.psa) : null,
    ruleOfFive: m.molecule_properties?.num_lip_ro5_violations ?? null,
    withdrawalFlag: m.withdraw_flag === true,
    blackBoxWarning: m.black_box_warning === 1,
    chemblUrl: `https://www.ebi.ac.uk/chembl/compound_report_card/${m.molecule_chembl_id}/`,
  };
}

// --- Mechanism of action --------------------------------------------------

interface ChEMBLMechanismResponse {
  mechanisms?: Array<{
    action_type?: string | null;
    mechanism_of_action?: string;
    direct_interaction?: number;
    target_chembl_id?: string;
    molecule_chembl_id?: string;
  }>;
}

export async function lookupMechanisms(
  chemblId: string
): Promise<ChEMBLMechanism[]> {
  const path = `/mechanism.json?molecule_chembl_id=${encodeURIComponent(chemblId)}&limit=10`;
  const data = await chemblFetch<ChEMBLMechanismResponse>(path);
  if (!data?.mechanisms) return [];
  return data.mechanisms.map((m) => ({
    chemblId: m.molecule_chembl_id ?? chemblId,
    actionType: m.action_type ?? null,
    mechanismOfAction: m.mechanism_of_action ?? "",
    targetType: m.target_chembl_id ?? null,
    directInteraction: m.direct_interaction === 1,
  }));
}

// --- Bioactivity measurements ---------------------------------------------

interface ChEMBLActivityResponse {
  activities?: Array<{
    activity_id: number;
    standard_type?: string | null;
    standard_value?: string | null;
    standard_units?: string | null;
    standard_relation?: string | null;
    target_pref_name?: string | null;
    target_organism?: string | null;
    assay_description?: string | null;
    pchembl_value?: string | null;
    document_journal?: string | null;
    document_year?: number | null;
    molecule_chembl_id?: string;
    molecule_pref_name?: string | null;
    canonical_smiles?: string | null;
  }>;
  page_meta?: { total_count?: number };
}

export async function lookupActivities(
  chemblId: string,
  opts: { type?: string; limit?: number } = {}
): Promise<{ activities: ChEMBLActivity[]; total: number }> {
  const limit = Math.min(opts.limit ?? 12, 25);
  const params = new URLSearchParams({
    molecule_chembl_id: chemblId,
    limit: String(limit),
    // pChemblValue = -log10(value in M); higher = more potent.
    // Sort desc so the most potent activities appear first.
    order_by: "-pchembl_value",
  });
  if (opts.type) params.set("standard_type", opts.type);
  // Exclude null/zero values
  params.set("standard_value__gt", "0");
  params.set("pchembl_value__isnull", "false");
  const path = `/activity.json?${params.toString()}`;
  const data = await chemblFetch<ChEMBLActivityResponse>(path);
  const list = data?.activities ?? [];
  const activities: ChEMBLActivity[] = list
    .filter((a) => a.standard_value && Number(a.standard_value) > 0)
    .map((a) => ({
      activityId: a.activity_id,
      standardType: a.standard_type ?? "Unknown",
      standardValue: a.standard_value ? Number(a.standard_value) : null,
      standardUnits: a.standard_units ?? null,
      relation: a.standard_relation ?? "=",
      targetName: a.target_pref_name ?? null,
      targetOrganism: a.target_organism ?? null,
      assayDescription: a.assay_description ?? null,
      pChemblValue: a.pchembl_value ? Number(a.pchembl_value) : null,
      journal: a.document_journal ?? null,
      year: a.document_year ?? null,
    }));
  return {
    activities,
    total: data?.page_meta?.total_count ?? 0,
  };
}

// --- Top-level: full bioactivity record by InChIKey ----------------------

export async function getBioactivity(
  inChIKey: string,
  activityType?: string
): Promise<ChEMBLBioactivity> {
  const molecule = await lookupMoleculeByInChIKey(inChIKey);
  if (!molecule) {
    return {
      molecule: null,
      mechanisms: [],
      activities: [],
      totalActivities: 0,
      fetchedAt: Date.now(),
    };
  }
  const [mechanisms, activityResult] = await Promise.all([
    lookupMechanisms(molecule.chemblId),
    lookupActivities(molecule.chemblId, { type: activityType, limit: 12 }),
  ]);
  return {
    molecule,
    mechanisms,
    activities: activityResult.activities,
    totalActivities: activityResult.total,
    fetchedAt: Date.now(),
  };
}

// --- Target-based search --------------------------------------------------

// ChEMBL target record (subset of fields we care about).
export interface ChEMBLTarget {
  chemblId: string;
  targetType: string;        // "SINGLE PROTEIN", "ORGANISM", "CELL-LINE", etc.
  prefName: string;
  organism: string | null;
  taxId: number | null;
  speciesGroupFlag: boolean;
  chemblUrl: string;
}

export interface TargetSearchResult {
  query: string;
  targets: ChEMBLTarget[];
  total: number;
}

// Search ChEMBL targets by preferred name (case-insensitive contains).
export async function searchTargets(
  query: string,
  limit: number = 10
): Promise<TargetSearchResult> {
  const clean = query.trim();
  if (!clean) return { query: "", targets: [], total: 0 };
  const params = new URLSearchParams({
    pref_name__icontains: clean,
    limit: String(Math.min(limit, 25)),
  });
  const path = `/target.json?${params.toString()}`;
  const data = await chemblFetch<{
    targets?: Array<{
      target_chembl_id?: string;
      target_type?: string;
      pref_name?: string;
      organism?: string | null;
      tax_id?: number | null;
      species_group_flag?: boolean;
    }>;
    page_meta?: { total_count?: number };
  }>(path);
  if (!data?.targets) return { query: clean, targets: [], total: 0 };
  return {
    query: clean,
    total: data.page_meta?.total_count ?? data.targets.length,
    targets: data.targets.map((t) => ({
      chemblId: t.target_chembl_id ?? "",
      targetType: t.target_type ?? "UNKNOWN",
      prefName: t.pref_name ?? "",
      organism: t.organism ?? null,
      taxId: t.tax_id ?? null,
      speciesGroupFlag: t.species_group_flag === true,
      chemblUrl: `https://www.ebi.ac.uk/chembl/target_report_card/${t.target_chembl_id}/`,
    })),
  };
}

// Compound active against a target (grouped + ranked by potency).
export interface ActiveCompound {
  chemblId: string;
  prefName: string | null;
  canonicalSMILES: string | null;
  standardType: string;       // "IC50", "Ki", etc.
  standardValue: number | null;
  standardUnits: string | null;
  pChemblValue: number | null;
  assayDescription: string | null;
  journal: string | null;
  year: number | null;
}

export interface TargetActivitiesResult {
  targetChemblId: string;
  totalActivities: number;
  compounds: ActiveCompound[];
}

// Get the most potent compounds active against a named target.
// Returns distinct compounds ranked by pChemblValue descending.
export async function getActiveCompoundsForTarget(
  targetChemblId: string,
  opts: { type?: string; limit?: number } = {}
): Promise<TargetActivitiesResult> {
  const limit = Math.min(opts.limit ?? 15, 50);
  const params = new URLSearchParams({
    target_chembl_id: targetChemblId,
    limit: String(limit * 3), // over-fetch to dedupe by molecule
    order_by: "-pchembl_value",
    pchembl_value__isnull: "false",
    standard_value__gt: "0",
  });
  if (opts.type) params.set("standard_type", opts.type);
  const path = `/activity.json?${params.toString()}`;
  const data = await chemblFetch<ChEMBLActivityResponse>(path);
  const activities = data?.activities ?? [];
  const totalCount = data?.page_meta?.total_count ?? 0;

  // Dedupe by molecule_chembl_id, keeping the most potent entry per compound.
  const seen = new Map<string, ActiveCompound>();
  for (const a of activities) {
    const molId = a.molecule_chembl_id;
    if (!molId) continue;
    if (seen.has(molId)) continue;
    seen.set(molId, {
      chemblId: molId,
      prefName: a.molecule_pref_name ?? null,
      canonicalSMILES: a.canonical_smiles ?? null,
      standardType: a.standard_type ?? "Unknown",
      standardValue: a.standard_value ? Number(a.standard_value) : null,
      standardUnits: a.standard_units ?? null,
      pChemblValue: a.pchembl_value ? Number(a.pchembl_value) : null,
      assayDescription: a.assay_description ?? null,
      journal: a.document_journal ?? null,
      year: a.document_year ?? null,
    });
    if (seen.size >= limit) break;
  }
  return {
    targetChemblId,
    totalActivities: totalCount,
    compounds: Array.from(seen.values()),
  };
}

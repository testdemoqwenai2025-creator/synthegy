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

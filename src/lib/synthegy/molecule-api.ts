// Frontend API client for the Synthegy molecule microservice (port 3002).
// All requests routed via Caddy gateway with ?XTransformPort=3002.

const MOLECULE_PORT = 3002;
const API_KEY =
  process.env.NEXT_PUBLIC_SYNTHYGY_API_KEY || "synthegy-demo-key";

// --- Types (mirror backend) -----------------------------------------------

export interface CompoundProperties {
  cid: number;
  molecularFormula: string;
  molecularWeight: string;
  canonicalSMILES: string;
  isomericSMILES?: string;
  inChIKey: string;
  inChI?: string;
  iupacName?: string;
  xLogP?: number;
  rotatableBondCount?: number;
  tpsa?: number;
  heavyAtomCount?: number;
  charge?: number;
  complexity?: number;
}

export interface CompoundDescription {
  cid: number;
  title: string;
  description?: string;
  sourceUrl?: string;
}

export interface MoleculeRecord {
  properties: CompoundProperties;
  synonyms: string[];
  descriptions: CompoundDescription[];
  pubchemUrl: string;
  fetchedAt: number;
  cached: boolean;
}

export interface SearchResult {
  query: string;
  total: number;
  count: number;
  compounds: Array<{
    cid: number;
    name: string;
    molecularFormula: string;
    molecularWeight: string;
    canonicalSMILES: string;
  }>;
}

export interface SimilarityResult {
  query: { smiles: string; threshold: number; maxRecords: number };
  count: number;
  compounds: Array<{
    cid: number;
    name: string;
    molecularFormula: string;
    molecularWeight: string;
    canonicalSMILES: string;
  }>;
}

// Result row shared by substructure + property-filter endpoints.
export interface CompoundSearchRow {
  cid: number;
  name: string;
  molecularFormula: string;
  molecularWeight: string;
  canonicalSMILES: string;
  xLogP?: number;
  tpsa?: number;
}

export interface SubstructureResult {
  query: { smiles: string; maxRecords: number };
  count: number;
  compounds: CompoundSearchRow[];
}

export type PropertyField =
  | "XLGP" | "TPSA" | "MW" | "HAC" | "RBC"
  | "HBDC" | "HBAC" | "CPLX" | "TFC";

export interface PropertyFilterSpec {
  field: PropertyField;
  min: number;
  max: number;
}

export interface PropertyFilterResult {
  query: PropertyFilterSpec[];
  totalMatches: number;
  count: number;
  compounds: CompoundSearchRow[];
}

// ChEMBL types
export interface ChEMBLMolecule {
  chemblId: string;
  prefName: string | null;
  maxPhase: number | null;
  firstApproval: number | null;
  atcCodes: string[];
  molecularWeight: number | null;
  alogp: number | null;
  psa: number | null;
  ruleOfFive: number | null;
  withdrawalFlag: boolean;
  blackBoxWarning: boolean;
  chemblUrl: string;
}

export interface ChEMBLMechanism {
  chemblId: string;
  actionType: string | null;
  mechanismOfAction: string;
  targetType: string | null;
  directInteraction: boolean;
}

export interface ChEMBLActivity {
  activityId: number;
  standardType: string;
  standardValue: number | null;
  standardUnits: string | null;
  relation: string;
  targetName: string | null;
  targetOrganism: string | null;
  assayDescription: string | null;
  pChemblValue: number | null;
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

// Target-based search types
export interface ChEMBLTarget {
  chemblId: string;
  targetType: string;
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

export interface ActiveCompound {
  chemblId: string;
  prefName: string | null;
  canonicalSMILES: string | null;
  standardType: string;
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

// --- Core fetch -----------------------------------------------------------

export class MoleculeApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function molFetch<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string> }
): Promise<T> {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("XTransformPort", String(MOLECULE_PORT));
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) {
      url.searchParams.set(k, v);
    }
  }
  const headers = new Headers(init?.headers);
  headers.set("x-api-key", API_KEY);

  const res = await fetch(url.toString(), { ...init, headers });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with ${res.status}`) || `Request failed with ${res.status}`;
    throw new MoleculeApiError(res.status, msg, body);
  }
  return body as T;
}

// --- Image URL helper (used directly in <img src>) -----------------------

export function moleculeImageUrl(
  identifier: string,
  by: "name" | "cid" = "name",
  size: string = "300x300"
): string {
  const path =
    by === "cid"
      ? `/api/molecule/cid/${encodeURIComponent(identifier)}/image`
      : `/api/molecule/name/${encodeURIComponent(identifier)}/image`;
  const url = new URL(path, window.location.origin);
  url.searchParams.set("XTransformPort", String(MOLECULE_PORT));
  url.searchParams.set("size", size);
  url.searchParams.set("apiKey", API_KEY);
  return url.toString();
}

// --- Export URL helper (used directly in <a href>) -----------------------

export function exportUrl(
  format: "sdf" | "csv",
  cids: number[]
): string {
  const url = new URL(`/api/molecule/export/${format}`, window.location.origin);
  url.searchParams.set("XTransformPort", String(MOLECULE_PORT));
  url.searchParams.set("cids", cids.join(","));
  url.searchParams.set("apiKey", API_KEY);
  return url.toString();
}

// --- Endpoint wrappers ----------------------------------------------------

export const moleculeApi = {
  health: () =>
    molFetch<{ status: string; data_source: string; uptime_sec: number }>("/health"),

  byName: (name: string) =>
    molFetch<{ molecule: MoleculeRecord }>(`/api/molecule/name/${encodeURIComponent(name)}`),

  byCid: (cid: number) =>
    molFetch<{ molecule: MoleculeRecord }>(`/api/molecule/cid/${cid}`),

  bySmiles: (smiles: string) =>
    molFetch<{ molecule: MoleculeRecord }>(
      `/api/molecule/smiles/${encodeURIComponent(smiles)}`
    ),

  search: (q: string, limit: number = 8) =>
    molFetch<SearchResult>(`/api/molecule/search`, { query: { q, limit: String(limit) } }),

  similarity: (smiles: string, threshold: number = 90, max: number = 8) =>
    molFetch<SimilarityResult>(`/api/molecule/similarity`, {
      query: { smiles, threshold: String(threshold), max: String(max) },
    }),

  substructure: (smiles: string, max: number = 12) =>
    molFetch<SubstructureResult>(`/api/molecule/substructure`, {
      query: { smiles, max: String(max) },
    }),

  propertyFilter: (filters: PropertyFilterSpec[], limit: number = 12) => {
    const fields = filters
      .map((f) => `${f.field}:${f.min}:${f.max}`)
      .join(",");
    return molFetch<PropertyFilterResult>(`/api/molecule/filter`, {
      query: { fields, limit: String(limit) },
    });
  },

  bioactivity: (inchikey: string, type?: string) =>
    molFetch<{ bioactivity: ChEMBLBioactivity }>(`/api/molecule/bioactivity`, {
      query: type ? { inchikey, type } : { inchikey },
    }),

  searchTargets: (q: string, limit: number = 10) =>
    molFetch<TargetSearchResult>(`/api/molecule/targets/search`, {
      query: { q, limit: String(limit) },
    }),

  activeCompoundsForTarget: (chemblId: string, type?: string, limit: number = 15) =>
    molFetch<TargetActivitiesResult>(`/api/molecule/targets/${chemblId}/compounds`, {
      query: { limit: String(limit), ...(type ? { type } : {}) },
    }),

  synonyms: (cid: number) =>
    molFetch<{ cid: number; count: number; synonyms: string[] }>(
      `/api/molecule/cid/${cid}/synonyms`
    ),

  stats: () =>
    molFetch<{ total: number; byKind: { kind: string; c: number }[] }>(
      `/api/molecule/stats`
    ),
};

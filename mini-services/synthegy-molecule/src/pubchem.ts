// PubChem PUG REST client + E-utilities search wrapper.
//
// All requests go through `pubchemFetch` which applies caching and respects
// PubChem's rate-limit guidance (5 requests/sec without API key).
//
// Reference: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest

import {
  cacheGet,
  cacheSet,
  cacheGetImage,
  cacheSetImage,
  cacheSetNegative,
  TTL,
} from "./cache.ts";

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

// --- Types ----------------------------------------------------------------

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

export interface SearchResult {
  query: string;
  cids: number[];
  total: number;
  source: "eutils" | "pubchem";
}

export interface CompoundDescription {
  cid: number;
  title: string;
  description?: string;
  sourceUrl?: string;
}

// --- Rate limit guard -----------------------------------------------------

const MIN_INTERVAL_MS = 220; // ~4.5 req/sec to stay under PubChem's 5/sec limit
let lastCall = 0;

async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCall;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastCall = Date.now();
}

// --- Core fetch with cache + retry ---------------------------------------

async function pubchemFetch<T>(
  url: string,
  cacheKey: string,
  opts: { ttlMs: number; kind: string; allowNegative?: boolean }
): Promise<T | null> {
  const cached = cacheGet<T>(cacheKey);
  if (cached !== null) return cached;

  await respectRateLimit();
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
  } catch (err) {
    throw new Error(
      `PubChem fetch failed: ${err instanceof Error ? err.message : "network error"}`
    );
  }

  if (res.status === 404 || res.status === 404) {
    if (opts.allowNegative) cacheSetNegative(cacheKey);
    return null;
  }
  if (res.status === 503 || res.status === 504) {
    // transient — wait and retry once
    await new Promise((r) => setTimeout(r, 800));
    return pubchemFetch<T>(url, cacheKey, opts);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PubChem returned ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as T;
  cacheSet(cacheKey, json, { ttlMs: opts.ttlMs, kind: opts.kind });
  return json;
}

// --- Public API -----------------------------------------------------------

const PROPS_STANDARD = [
  "MolecularFormula",
  "MolecularWeight",
  "CanonicalSMILES",
  "IsomericSMILES",
  "InChIKey",
  "InChI",
  "IUPACName",
  "XLogP",
  "RotatableBondCount",
  "TPSA",
  "HeavyAtomCount",
  "Charge",
  "Complexity",
].join(",");

interface PropertyResponse {
  PropertyTable?: {
    Properties?: Array<Record<string, string | number>>;
  };
}

export async function getPropertiesByName(
  name: string
): Promise<CompoundProperties | null> {
  const clean = name.trim();
  if (!clean) return null;
  const key = `prop:name:${clean.toLowerCase()}`;
  const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(
    clean
  )}/property/${PROPS_STANDARD}/JSON`;
  const data = await pubchemFetch<PropertyResponse>(url, key, {
    ttlMs: TTL.PROPERTIES,
    kind: "properties",
    allowNegative: true,
  });
  if (!data?.PropertyTable?.Properties?.length) return null;
  return normaliseProperties(data.PropertyTable.Properties[0]);
}

export async function getPropertiesByCID(
  cid: number
): Promise<CompoundProperties | null> {
  const key = `prop:cid:${cid}`;
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/property/${PROPS_STANDARD}/JSON`;
  const data = await pubchemFetch<PropertyResponse>(url, key, {
    ttlMs: TTL.PROPERTIES,
    kind: "properties",
  });
  if (!data?.PropertyTable?.Properties?.length) return null;
  return normaliseProperties(data.PropertyTable.Properties[0]);
}

export async function getPropertiesBySMILES(
  smiles: string
): Promise<CompoundProperties | null> {
  const clean = smiles.trim();
  if (!clean) return null;
  const key = `prop:smiles:${clean}`;
  const url = `${PUBCHEM_BASE}/compound/smiles/${encodeURIComponent(
    clean
  )}/property/${PROPS_STANDARD}/JSON`;
  const data = await pubchemFetch<PropertyResponse>(url, key, {
    ttlMs: TTL.PROPERTIES,
    kind: "properties",
    allowNegative: true,
  });
  if (!data?.PropertyTable?.Properties?.length) return null;
  return normaliseProperties(data.PropertyTable.Properties[0]);
}

interface CidsResponse {
  IdentifierList?: { CID?: number[] };
}

export async function getCidsByName(name: string): Promise<number[]> {
  const clean = name.trim();
  if (!clean) return [];
  const key = `cids:name:${clean.toLowerCase()}`;
  const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(clean)}/cids/JSON`;
  const data = await pubchemFetch<CidsResponse>(url, key, {
    ttlMs: TTL.PROPERTIES,
    kind: "properties",
    allowNegative: true,
  });
  return data?.IdentifierList?.CID ?? [];
}

interface SynonymsResponse {
  InformationList?: {
    Information?: Array<{ CID?: number; Synonym?: string[] }>;
  };
}

export async function getSynonyms(cid: number): Promise<string[]> {
  const key = `syn:cid:${cid}`;
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/synonyms/JSON`;
  const data = await pubchemFetch<SynonymsResponse>(url, key, {
    ttlMs: TTL.SYNONYMS,
    kind: "synonyms",
  });
  return data?.InformationList?.Information?.[0]?.Synonym ?? [];
}

interface DescriptionResponse {
  InformationList?: {
    Information?: Array<{
      CID?: number;
      Title?: string;
      Description?: string;
      DescriptionSourceName?: string;
      DescriptionURL?: string;
    }>;
  };
}

export async function getDescriptions(
  cid: number
): Promise<CompoundDescription[]> {
  const key = `desc:cid:${cid}`;
  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/description/JSON`;
  const data = await pubchemFetch<DescriptionResponse>(url, key, {
    ttlMs: TTL.DESCRIPTION,
    kind: "description",
  });
  const list = data?.InformationList?.Information ?? [];
  return list
    .filter((i) => i.Description)
    .map((i) => ({
      cid: i.CID ?? cid,
      title: i.Title ?? "",
      description: i.Description,
      sourceUrl: i.DescriptionURL,
    }));
}

// E-utilities search — returns CIDs ranked by relevance for a free-text query.
interface ESearchResponse {
  esearchresult?: {
    count: string;
    idlist: string[];
  };
}

export async function searchCompounds(
  query: string,
  limit: number = 10
): Promise<SearchResult> {
  const clean = query.trim();
  if (!clean) return { query: "", cids: [], total: 0, source: "eutils" };
  const key = `search:${clean.toLowerCase()}:${limit}`;
  const cached = cacheGet<SearchResult>(key);
  if (cached) return cached;

  // Use [name] field first for high precision, fall back to all-fields.
  const url = `${EUTILS_BASE}/esearch.fcgi?db=pccompound&term=${encodeURIComponent(
    clean
  )}[All+Fields]&retmode=json&retmax=${limit}&sort=relevance`;
  await respectRateLimit();
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new Error(
      `E-utilities search failed: ${err instanceof Error ? err.message : "network error"}`
    );
  }
  if (!res.ok) {
    throw new Error(`E-utilities returned ${res.status}`);
  }
  const data = (await res.json()) as ESearchResponse;
  const cids = (data.esearchresult?.idlist ?? [])
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const result: SearchResult = {
    query: clean,
    cids,
    total: Number(data.esearchresult?.count ?? 0),
    source: "eutils",
  };
  cacheSet(key, result, { ttlMs: TTL.SEARCH, kind: "search" });
  return result;
}

interface SimilarityResponse {
  IdentifierList?: { CID?: number[] };
}

export async function similaritySearch(
  smiles: string,
  threshold: number = 90,
  maxRecords: number = 10
): Promise<number[]> {
  const clean = smiles.trim();
  if (!clean) return [];
  const key = `sim:${threshold}:${maxRecords}:${clean}`;
  const url = `${PUBCHEM_BASE}/compound/fastsimilarity_2d/smiles/${encodeURIComponent(
    clean
  )}/cids/JSON?Threshold=${threshold}&MaxRecords=${maxRecords}`;
  const data = await pubchemFetch<SimilarityResponse>(url, key, {
    ttlMs: TTL.SEARCH,
    kind: "search",
  });
  return data?.IdentifierList?.CID ?? [];
}

// --- Substructure search --------------------------------------------------

// PubChem PUG REST fastsubstructure — find all compounds containing the
// given SMILES scaffold. Returns CIDs in descending depositor-count order
// (most-deposited first, which is a useful proxy for "most studied").
export async function substructureSearch(
  smiles: string,
  maxRecords: number = 15
): Promise<number[]> {
  const clean = smiles.trim();
  if (!clean) return [];
  const key = `sub:${maxRecords}:${clean}`;
  const url = `${PUBCHEM_BASE}/compound/fastsubstructure/smiles/${encodeURIComponent(
    clean
  )}/cids/JSON?MaxRecords=${maxRecords}`;
  const data = await pubchemFetch<SimilarityResponse>(url, key, {
    ttlMs: TTL.SEARCH,
    kind: "search",
  });
  return data?.IdentifierList?.CID ?? [];
}

// --- Property-based filtering ---------------------------------------------

// Uses NCBI E-utilities with numerical field ranges to filter PubChem
// compounds by computed properties (XLogP, TPSA, MW, etc.).
//
// Field codes (verified against einfo.fcgi):
//   XLGP  = XLogP
//   TPSA  = TPSA
//   MW    = MolecularWeight
//   HAC   = HeavyAtomCount
//   RBC   = RotatableBondCount
//   HBDC  = HydrogenBondDonorCount
//   HBAC  = HydrogenBondAcceptorCount
//   CPLX  = Complexity
//   TFC   = TotalFormalCharge
//
// Range syntax:  min:max[FIELD]   e.g. 2:4[XLGP]

export interface PropertyFilter {
  field: "XLGP" | "TPSA" | "MW" | "HAC" | "RBC" | "HBDC" | "HBAC" | "CPLX" | "TFC";
  min: number;
  max: number;
}

export interface PropertyFilterResult {
  query: PropertyFilter[];
  total: number;
  cids: number[];
  source: "eutils";
}

export async function propertyFilter(
  filters: PropertyFilter[],
  limit: number = 15
): Promise<PropertyFilterResult> {
  if (!filters.length) {
    return { query: [], total: 0, cids: [], source: "eutils" };
  }
  // Build the E-utilities term. Each filter becomes `min:max[FIELD]`.
  // Multiple filters are ANDed.
  const term = filters
    .map((f) => `${f.min}:${f.max}[${f.field}]`)
    .join("+AND+");
  const cacheKey = `propfilter:${term}:${limit}`;
  const cached = cacheGet<PropertyFilterResult>(cacheKey);
  if (cached) return cached;

  const url = `${EUTILS_BASE}/esearch.fcgi?db=pccompound&term=${term}&retmode=json&retmax=${limit}&sort=relevance`;
  await respectRateLimit();
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new Error(
      `E-utilities property query failed: ${err instanceof Error ? err.message : "network error"}`
    );
  }
  if (!res.ok) {
    throw new Error(`E-utilities returned ${res.status}`);
  }
  const data = (await res.json()) as ESearchResponse;
  const cids = (data.esearchresult?.idlist ?? [])
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const result: PropertyFilterResult = {
    query: filters,
    total: Number(data.esearchresult?.count ?? 0),
    cids,
    source: "eutils",
  };
  cacheSet(cacheKey, result, { ttlMs: TTL.SEARCH, kind: "search" });
  return result;
}

// Image proxy — fetches the 2D structure PNG from PubChem and caches it.
export async function getStructureImage(
  identifier: string,
  by: "name" | "cid" | "smiles" = "name",
  size: string = "300x300"
): Promise<{ blob: Uint8Array; contentType: string } | null> {
  const key = `img:${by}:${identifier}:${size}`;
  const cached = cacheGetImage(key);
  if (cached) return cached;

  const id = encodeURIComponent(identifier);
  const url =
    by === "cid"
      ? `${PUBCHEM_BASE}/compound/cid/${id}/PNG?image_size=${size}`
      : by === "smiles"
      ? `${PUBCHEM_BASE}/compound/smiles/${id}/PNG?image_size=${size}`
      : `${PUBCHEM_BASE}/compound/name/${id}/PNG?image_size=${size}`;

  await respectRateLimit();
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404 || res.status === 404) return null;
    throw new Error(`PubChem image returned ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  const blob = new Uint8Array(buf);
  const contentType = res.headers.get("content-type") || "image/png";
  cacheSetImage(key, blob, contentType);
  return { blob, contentType };
}

// --- Helpers --------------------------------------------------------------

function normaliseProperties(
  raw: Record<string, string | number>
): CompoundProperties {
  return {
    cid: Number(raw.CID ?? 0),
    molecularFormula: String(raw.MolecularFormula ?? ""),
    molecularWeight: String(raw.MolecularWeight ?? ""),
    canonicalSMILES: String(raw.CanonicalSMILES ?? raw.ConnectivitySMILES ?? ""),
    isomericSMILES: raw.IsomericSMILES ? String(raw.IsomericSMILES) : undefined,
    inChIKey: String(raw.InChIKey ?? ""),
    inChI: raw.InChI ? String(raw.InChI) : undefined,
    iupacName: raw.IUPACName ? String(raw.IUPACName) : undefined,
    xLogP: raw.XLogP !== undefined ? Number(raw.XLogP) : undefined,
    rotatableBondCount:
      raw.RotatableBondCount !== undefined
        ? Number(raw.RotatableBondCount)
        : undefined,
    tpsa: raw.TPSA !== undefined ? Number(raw.TPSA) : undefined,
    heavyAtomCount: raw.HeavyAtomCount !== undefined ? Number(raw.HeavyAtomCount) : undefined,
    charge: raw.Charge !== undefined ? Number(raw.Charge) : undefined,
    complexity: raw.Complexity !== undefined ? Number(raw.Complexity) : undefined,
  };
}

// --- SDF (Structure-Data File) fetch --------------------------------------

// Fetches the 2D SDF record for a compound from PubChem. The SDF includes
// the full connection table (atoms + bonds) plus PubChem's computed
// properties, suitable for loading into RDKit, OpenBabel, ChemDraw, etc.
//
// Cached for 30 days (structures are immutable).
export async function getSDFByCID(cid: number): Promise<string | null> {
  const key = `sdf:cid:${cid}`;
  const cached = cacheGet<string>(key);
  if (cached) return cached;

  const url = `${PUBCHEM_BASE}/compound/cid/${cid}/SDF?record_type=2d`;
  await respectRateLimit();
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`PubChem SDF returned ${res.status} for CID ${cid}`);
  }
  const sdf = await res.text();
  cacheSet(key, sdf, { ttlMs: TTL.PROPERTIES, kind: "properties" });
  return sdf;
}

// Fetch SDF records for multiple CIDs in a single PubChem request
// (PubChem supports comma-separated CIDs, returns concatenated SDF).
export async function getSDFByCIDs(cids: number[]): Promise<string> {
  if (cids.length === 0) return "";
  if (cids.length === 1) {
    const sdf = await getSDFByCID(cids[0]);
    return sdf ?? "";
  }
  const cidList = cids.slice(0, 100).join(","); // PubChem limit
  const key = `sdf:cids:${cidList}`;
  const cached = cacheGet<string>(key);
  if (cached) return cached;

  const url = `${PUBCHEM_BASE}/compound/cid/${cidList}/SDF?record_type=2d`;
  await respectRateLimit();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PubChem SDF batch returned ${res.status}`);
  }
  const sdf = await res.text();
  cacheSet(key, sdf, { ttlMs: TTL.PROPERTIES, kind: "properties" });
  return sdf;
}

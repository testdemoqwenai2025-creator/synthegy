// API clients for RCSB PDB, KEGG, OpenTargets, and Google Patents.
// All free, no API keys required.

// --- RCSB PDB -------------------------------------------------------------

const RCSB_SEARCH = "https://search.rcsb.org/rcsbsearch/v2/query";
const RCSB_DATA = "https://data.rcsb.org/rest/v1/core";

export interface PdbEntry {
  pdbId: string;
  title: string;
  method: string | null;
  resolution: number | null;
  releaseDate: string | null;
  ligands: string[];
  organism: string | null;
  uniprotIds: string[];
}

export async function searchPdb(query: string, limit: number = 8): Promise<{ total: number; entries: PdbEntry[] }> {
  const body = {
    query: { type: "terminal", service: "full_text", parameters: { value: query } },
    return_type: "entry",
    request_options: { paginate: { start: 0, rows: limit } },
  };
  const res = await fetch(RCSB_SEARCH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RCSB search returned ${res.status}`);
  const data = await res.json();
  const total = data.total_count ?? 0;
  // result_set is a list of { identifier, score } objects
  const results = Array.isArray(data.result_set) ? data.result_set : (data.result_set?.results ?? data.results ?? []);
  const pdbIds = results.map((r: { identifier?: string }) => r.identifier).filter(Boolean).slice(0, limit);
  const entries = await Promise.all(pdbIds.map((id: string) => getPdbEntry(id).catch(() => null)));
  return { total, entries: entries.filter((e): e is PdbEntry => e !== null) };
}

export async function getPdbEntry(pdbId: string): Promise<PdbEntry | null> {
  const res = await fetch(`${RCSB_DATA}/entry/${pdbId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RCSB entry returned ${res.status}`);
  const d = await res.json();
  const rcsb = d.rcsb_entry_info ?? {};
  const struct = d.struct ?? {};
  const polymerEntities = d.rcsb_polymer_entity_container_identifiers ?? [];
  const uniprotIds = (d.rcsb_polymer_entity?.flatMap?.((e: { rcsb_polymer_entity_container_identifiers?: { uniprot_ids?: string[] } }) =>
    e.rcsb_polymer_entity_container_identifiers?.uniprot_ids ?? []) ?? []).filter(Boolean);
  return {
    pdbId: d.rcsb_id ?? pdbId,
    title: struct.title ?? "(untitled)",
    method: Array.isArray(rcsb.experimental_method) ? rcsb.experimental_method[0] : null,
    resolution: Array.isArray(rcsb.resolution_combined) ? rcsb.resolution_combined[0] : null,
    releaseDate: rcsb.deposit_date ?? null,
    ligands: (d.rcsb_nonpolymer_entity_container_identifiers?.map?.((e: { id?: string }) => e.id) ?? []).filter(Boolean),
    organism: d.rcsb_entity_source_organism?.[0]?.ncbi_scientific_name ?? null,
    uniprotIds: uniprotIds.slice(0, 5),
  };
}

// --- KEGG -----------------------------------------------------------------

const KEGG_BASE = "https://rest.kegg.jp";

export interface KeggPathway {
  pathwayId: string;
  name: string;
}

// Given a KEGG compound ID (e.g. C01405 for aspirin), return linked pathways.
export async function getKeggPathways(compoundId: string): Promise<KeggPathway[]> {
  const res = await fetch(`${KEGG_BASE}/link/pathway/${compoundId}`);
  if (!res.ok) throw new Error(`KEGG returned ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").filter(Boolean);
  // Each line: "cpd:C01405\tpath:map00010"
  const pathwayIds = lines.map(l => l.split("\t")[1]?.replace("path:", "")).filter(Boolean);
  if (pathwayIds.length === 0) return [];
  // Fetch pathway names
  const namesRes = await fetch(`${KEGG_BASE}/list/pathway`);
  if (!namesRes.ok) return pathwayIds.map(id => ({ pathwayId: id, name: id }));
  const namesText = await namesRes.text();
  const nameMap = new Map<string, string>();
  for (const line of namesText.trim().split("\n")) {
    const [id, name] = line.split("\t");
    if (id && name) nameMap.set(id.replace("path:", ""), name);
  }
  return pathwayIds.slice(0, 15).map(id => ({
    pathwayId: id,
    name: nameMap.get(id) ?? id,
  }));
}

// Search for a KEGG compound by name, return its ID.
export async function findKeggCompound(name: string): Promise<string | null> {
  const res = await fetch(`${KEGG_BASE}/find/compound/${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  const text = await res.text();
  const firstLine = text.trim().split("\n")[0];
  if (!firstLine) return null;
  const id = firstLine.split("\t")[0]?.replace("cpd:", "");
  return id ?? null;
}

// --- OpenTargets ----------------------------------------------------------

const OT_GQL = "https://api.platform.opentargets.org/api/v4/graphql";

export interface DiseaseAssociation {
  diseaseId: string;
  diseaseName: string;
  score: number;
  datasource: string;
}

// Given a target Ensembl gene ID (e.g. ENSG00000073756 for PTGS2), return
// associated diseases with association scores.
export async function getDiseasesForTarget(ensemblId: string, limit: number = 8): Promise<DiseaseAssociation[]> {
  const query = `{
    target(ensemblId: "${ensemblId}") {
      associatedDiseases {
        rows {
          score
          disease { id name }
        }
      }
    }
  }`;
  const res = await fetch(OT_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`OpenTargets returned ${res.status}`);
  const data = await res.json();
  const rows = data?.data?.target?.associatedDiseases?.rows ?? [];
  return rows.map((r: { score: number; disease: { id: string; name: string }; datatype_scores?: { id: string; score: number }[] }) => ({
    diseaseId: r.disease.id,
    diseaseName: r.disease.name,
    score: r.score,
    datasource: r.datatype_scores?.[0]?.id ?? "overall",
  }));
}

// Search for a target by gene symbol, return Ensembl ID.
export async function findTarget(geneSymbol: string): Promise<{ ensemblId: string; name: string } | null> {
  const query = `{ search(queryString: "${geneSymbol}") { hits { id name entity } } }`;
  const res = await fetch(OT_GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hits = data?.data?.search?.hits ?? [];
  const targetHit = hits.find((h: { entity: string; name: string; id: string }) => h.entity === "target" && h.name.toUpperCase() === geneSymbol.toUpperCase());
  if (!targetHit) return null;
  return { ensemblId: targetHit.id, name: targetHit.name };
}

// --- Google Patents -------------------------------------------------------

export interface PatentResult {
  patentId: string;
  title: string;
  snippet: string;
  assignee: string | null;
  filingDate: string | null;
  publicationDate: string | null;
  url: string;
}

export async function searchPatents(query: string, limit: number = 8): Promise<{ total: number; patents: PatentResult[] }> {
  // Google Patents public xhr endpoint (no key required, but needs browser UA).
  const encoded = encodeURIComponent(`q=${encodeURIComponent(query)}&num=${limit}`);
  const res = await fetch(`https://patents.google.com/xhr/query?url=${encoded}&exp=`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Google Patents returned ${res.status}`);
  const data = await res.json();
  const total = data?.results?.total_num_results ?? 0;
  const cluster = data?.results?.cluster ?? [];
  const items = cluster.flatMap((c: { result: PatentResult[] }) => c.result ?? []);
  const patents: PatentResult[] = items.slice(0, limit).map((p: { id: string; patent: { title: string; snippet: string; assignee: string[]; filing_date: string; publication_date: string; publication_number: string } }) => ({
    patentId: p.patent?.publication_number ?? p.id,
    title: (p.patent?.title ?? "").replace(/&hellip;/g, "…").replace(/&[a-z]+;/g, ""),
    snippet: (p.patent?.snippet ?? "").replace(/&hellip;/g, "…").replace(/&[a-z]+;/g, "").slice(0, 200),
    assignee: p.patent?.assignee?.[0] ?? null,
    filingDate: p.patent?.filing_date ?? null,
    publicationDate: p.patent?.publication_date ?? null,
    url: `https://patents.google.com/${p.id}`,
  }));
  return { total, patents };
}

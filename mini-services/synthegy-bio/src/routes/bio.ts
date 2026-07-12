// Routes for the bio service: PDB structures, knowledge graph, patents.

import { Hono } from "hono";
import { searchPdb, getPdbEntry, searchPatents } from "../clients.ts";
import { buildKnowledgeGraph } from "../graph.ts";
import { cacheGet, cacheSet, cacheStats, TTL } from "../cache.ts";

export const bio = new Hono();

// GET /health
bio.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "synthegy-bio",
    version: "1.0.0",
    description: "Protein structures (RCSB PDB) + knowledge graph (KEGG + OpenTargets) + patents (Google Patents)",
    data_sources: ["RCSB PDB (220K+ structures)", "KEGG (pathways)", "OpenTargets (target-disease)", "Google Patents (100M+ patents)"],
    uptime_sec: Math.round(process.uptime()),
  });
});

// GET /api/bio/proteins/search?q=cyclooxygenase&limit=8
bio.get("/proteins/search", async (c) => {
  const q = c.req.query("q") ?? "";
  const limit = Math.min(Number(c.req.query("limit") ?? 8), 15);
  if (!q.trim()) return c.json({ error: "validation_error", message: "q is required" }, 400);
  const cacheKey = `pdb:${q.toLowerCase()}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return c.json({ ...cached, cached: true });
  const result = await searchPdb(q, limit).catch((e) => { throw new Error(`PDB search failed: ${e.message}`); });
  cacheSet(cacheKey, result, { ttlMs: TTL.PROTEINS, kind: "proteins" });
  return c.json({ ...result, cached: false });
});

// GET /api/bio/proteins/:pdbId
bio.get("/proteins/:pdbId", async (c) => {
  const pdbId = c.req.param("pdbId");
  const cacheKey = `pdb_entry:${pdbId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return c.json({ entry: cached, cached: true });
  const entry = await getPdbEntry(pdbId).catch((e) => { throw new Error(`PDB fetch failed: ${e.message}`); });
  if (!entry) return c.json({ error: "not_found", message: `PDB entry ${pdbId} not found` }, 404);
  cacheSet(cacheKey, entry, { ttlMs: TTL.PROTEINS, kind: "proteins" });
  return c.json({ entry, cached: false });
});

// POST /api/bio/graph
// Body: { compoundName, compoundSmiles, targets: [{ chemblId, name, geneSymbol? }] }
// Returns the full knowledge graph: compound → targets → pathways → diseases.
bio.post("/graph", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.compoundName || !body?.targets) {
    return c.json({ error: "validation_error", message: "compoundName and targets[] are required" }, 400);
  }
  const cacheKey = `graph:${body.compoundName}:${body.targets.map((t: { chemblId: string }) => t.chemblId).join(",")}`;
  const cached = cacheGet(cacheKey);
  if (cached) return c.json({ graph: cached, cached: true });
  const graph = await buildKnowledgeGraph(
    body.compoundName,
    body.compoundSmiles ?? "",
    body.targets
  ).catch((e) => { throw new Error(`Graph build failed: ${e.message}`); });
  cacheSet(cacheKey, graph, { ttlMs: TTL.GRAPH, kind: "graph" });
  return c.json({ graph, cached: false });
});

// GET /api/bio/patents?q=aspirin+synthesis&limit=8
bio.get("/patents", async (c) => {
  const q = c.req.query("q") ?? "";
  const limit = Math.min(Number(c.req.query("limit") ?? 8), 20);
  if (!q.trim()) return c.json({ error: "validation_error", message: "q is required" }, 400);
  const cacheKey = `patents:${q.toLowerCase()}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return c.json({ ...cached, cached: true });
  const result = await searchPatents(q, limit).catch((e) => { throw new Error(`Patent search failed: ${e.message}`); });
  cacheSet(cacheKey, result, { ttlMs: TTL.PATENTS, kind: "patents" });
  return c.json({ ...result, cached: false });
});

// GET /api/bio/stats
bio.get("/stats", (c) => c.json(cacheStats()));

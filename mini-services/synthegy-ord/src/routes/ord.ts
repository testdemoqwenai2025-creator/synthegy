// Routes for the ORD + ADMET + literature service.

import { Hono } from "hono";
import { searchReactions, computeAdmet, listDatasets } from "../python-bridge.ts";
import { searchLiterature } from "../epmc.ts";
import { cacheGet, cacheSet, cacheStats, TTL } from "../cache.ts";

export const ord = new Hono();

// GET /health — public liveness probe
ord.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "synthegy-ord",
    version: "1.0.0",
    description: "Open Reaction Database + ADMET + Europe PMC literature",
    data_sources: [
      "Open Reaction Database (ord-data, 550+ datasets, 100K+ reactions)",
      "RDKit (computed ADMET descriptors)",
      "Europe PMC (40M+ biomedical citations)",
    ],
    time: new Date().toISOString(),
    uptime_sec: Math.round(process.uptime()),
  });
});

// GET /api/ord/reactions/search?smiles=...&limit=10
// Search curated ORD datasets for reactions whose product matches the SMILES.
ord.get("/reactions/search", async (c) => {
  const smiles = c.req.query("smiles") ?? "";
  const limit = Math.min(Number(c.req.query("limit") ?? 10), 25);
  if (!smiles.trim()) {
    return c.json({ error: "validation_error", message: "smiles query parameter is required" }, 400);
  }
  const cacheKey = `reactions:${smiles}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return c.json({ ...cached, cached: true });
  }
  const result = await searchReactions(smiles, limit).catch((err) => {
    throw new Error(`ORD search failed: ${err.message}`);
  });
  cacheSet(cacheKey, result, { ttlMs: TTL.REACTIONS, kind: "reactions" });
  return c.json({ ...result, cached: false });
});

// GET /api/ord/admet?smiles=...
// Compute ADMET descriptors + rule-based predictions via RDKit.
ord.get("/admet", async (c) => {
  const smiles = c.req.query("smiles") ?? "";
  if (!smiles.trim()) {
    return c.json({ error: "validation_error", message: "smiles query parameter is required" }, 400);
  }
  const cacheKey = `admet:${smiles}`;
  const cached = cacheGet<ReturnType<typeof computeAdmet> extends Promise<infer T> ? T : never>(cacheKey);
  if (cached) {
    return c.json({ ...cached, cached: true });
  }
  const result = await computeAdmet(smiles).catch((err) => {
    throw new Error(`ADMET computation failed: ${err.message}`);
  });
  if ((result as { error?: string }).error) {
    return c.json({ error: "invalid_smiles", message: (result as { error: string }).error }, 400);
  }
  cacheSet(cacheKey, result, { ttlMs: TTL.ADMET, kind: "admet" });
  return c.json({ ...result, cached: false });
});

// GET /api/ord/literature?q=...&limit=5
// Search Europe PMC for papers mentioning the query (compound name, target, reaction).
ord.get("/literature", async (c) => {
  const q = c.req.query("q") ?? "";
  const limit = Math.min(Number(c.req.query("limit") ?? 5), 25);
  if (!q.trim()) {
    return c.json({ error: "validation_error", message: "q query parameter is required" }, 400);
  }
  const cacheKey = `lit:${q.toLowerCase()}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return c.json({ ...cached, cached: true });
  }
  const result = await searchLiterature(q, limit).catch((err) => {
    throw new Error(`Literature search failed: ${err.message}`);
  });
  cacheSet(cacheKey, result, { ttlMs: TTL.LITERATURE, kind: "literature" });
  return c.json({ ...result, cached: false });
});

// GET /api/ord/datasets — list curated dataset IDs
ord.get("/datasets", async (c) => {
  const cacheKey = "datasets:list";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return c.json({ ...cached, cached: true });
  }
  const result = await listDatasets().catch(() => ({ datasets: [] }));
  cacheSet(cacheKey, result, { ttlMs: TTL.REACTIONS, kind: "reactions" });
  return c.json({ ...result, cached: false });
});

// GET /api/ord/stats — cache statistics
ord.get("/stats", (c) => {
  return c.json(cacheStats());
});

// Synthegy molecule microservice — Bun + Hono on port 3002.
//
// Wraps PubChem PUG REST + NCBI E-utilities with a SQLite-backed cache.
// Provides compound lookup, search, similarity, and 2D structure images.
//
// Architecture:
//   [ Browser / Frontend ]
//      |
//      +-- /api/molecule/name/:name          (full record: props + syns + desc)
//      +-- /api/molecule/cid/:cid             (full record by CID)
//      +-- /api/molecule/smiles/:smiles       (full record by SMILES)
//      +-- /api/molecule/search?q=&limit=     (E-utilities ranked search)
//      +-- /api/molecule/similarity?smiles=   (2D similarity search)
//      +-- /api/molecule/name/:name/image     (PNG proxy, 30-day cache)
//      +-- /api/molecule/cid/:cid/image       (PNG proxy by CID)
//      +-- /api/molecule/cid/:cid/synonyms
//      +-- /api/molecule/stats                (cache hit/miss stats)
//      +-- /api/molecule/cache/clear          (purge expired)
//      +-- /health                            (no auth)

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { requestLogger } from "./src/middleware/logger.ts";
import { apiKeyAuth } from "./src/middleware/auth.ts";
import { health } from "./src/routes/health.ts";
import { molecule } from "./src/routes/molecule.ts";
import { errorHandler } from "./src/middleware/errorHandler.ts";
import "./src/cache.ts"; // initialise schema

const PORT = 3002;

const app = new Hono();

app.use("*", cors());
app.use("*", honoLogger());
app.use("*", requestLogger());
app.onError(errorHandler);

app.route("/health", health);

app.use("/api/*", apiKeyAuth());
app.route("/api/molecule", molecule);

app.notFound((c) =>
  c.json({ error: "not_found", message: `Route ${c.req.method} ${c.req.path} not found` }, 404)
);

console.log(`[synthegy-molecule] listening on http://localhost:${PORT}`);
console.log(`[synthegy-molecule] data sources: PubChem PUG REST + NCBI E-utilities + ChEMBL`);
console.log(`[synthegy-molecule] demo api key: synthegy-demo-key`);
console.log(`[synthegy-molecule] routes:`);
console.log(`  GET  /health`);
console.log(`  GET  /api/molecule/name/:name              (full record)`);
console.log(`  GET  /api/molecule/cid/:cid                (full record by CID)`);
console.log(`  GET  /api/molecule/smiles/:smiles          (full record by SMILES)`);
console.log(`  GET  /api/molecule/search?q=&limit=        (ranked search)`);
console.log(`  GET  /api/molecule/similarity?smiles=&threshold=&max=`);
console.log(`  GET  /api/molecule/substructure?smiles=&max=    (substructure search)`);
console.log(`  GET  /api/molecule/filter?fields=XLGP:2:4,TPSA:60:100&limit=15`);
console.log(`  GET  /api/molecule/bioactivity?inchikey=&type=IC50  (ChEMBL)`);
console.log(`  GET  /api/molecule/targets/search?q=            (ChEMBL target search)`);
console.log(`  GET  /api/molecule/targets/:chemblId/compounds?type=&limit=`);
console.log(`  GET  /api/molecule/export/sdf?cids=2244,5161    (SDF download)`);
console.log(`  GET  /api/molecule/export/csv?cids=2244,5161    (CSV download)`);
console.log(`  GET  /api/molecule/name/:name/image?size=  (PNG proxy)`);
console.log(`  GET  /api/molecule/cid/:cid/image?size=    (PNG proxy)`);
console.log(`  GET  /api/molecule/cid/:cid/synonyms`);
console.log(`  GET  /api/molecule/stats                   (cache stats)`);
console.log(`  POST /api/molecule/cache/clear             (purge expired)`);

Bun.serve({ port: PORT, fetch: app.fetch, idleTimeout: 60 });

process.on("SIGINT", () => {
  console.log("\n[synthegy-molecule] shutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("[synthegy-molecule] received SIGTERM, shutting down...");
  process.exit(0);
});

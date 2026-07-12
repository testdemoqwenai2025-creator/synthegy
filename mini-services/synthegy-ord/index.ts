// Synthegy ORD + ADMET + Literature microservice.
//
// Bun + Hono on port 3003. Wraps the Open Reaction Database (via Python
// helper using ord_schema + rdkit), computed ADMET descriptors, and
// Europe PMC literature search.
//
// Architecture:
//   [ Browser / Frontend ]
//      |
//      +-- /api/ord/reactions/search?smiles=    (substructure search across ORD)
//      +-- /api/ord/admet?smiles=               (Lipinski/Veber/BBB/PAINS)
//      +-- /api/ord/literature?q=               (Europe PMC paper search)
//      +-- /api/ord/datasets                    (list curated ORD datasets)
//      +-- /api/ord/stats                       (cache stats)
//      +-- /health                              (no auth)

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestLogger, errorHandler } from "./src/middleware/logger.ts";
import { apiKeyAuth } from "./src/middleware/auth.ts";
import { ord } from "./src/routes/ord.ts";
import "./src/cache.ts"; // initialise schema

const PORT = 3003;

const app = new Hono();
app.use("*", cors());
app.use("*", requestLogger());
app.onError(errorHandler);

app.route("/health", ord);
app.use("/api/*", apiKeyAuth());
app.route("/api/ord", ord);

app.notFound((c) =>
  c.json({ error: "not_found", message: `Route ${c.req.method} ${c.req.path} not found` }, 404)
);

console.log(`[synthegy-ord] listening on http://localhost:${PORT}`);
console.log(`[synthegy-ord] data sources:`);
console.log(`  - Open Reaction Database (ord-data on Hugging Face, 550+ datasets)`);
console.log(`  - RDKit computed ADMET (Lipinski, Veber, BBB, PAINS alerts)`);
console.log(`  - Europe PMC (40M+ biomedical citations)`);
console.log(`[synthegy-ord] demo api key: synthegy-demo-key`);
console.log(`[synthegy-ord] routes:`);
console.log(`  GET  /health`);
console.log(`  GET  /api/ord/reactions/search?smiles=&limit=`);
console.log(`  GET  /api/ord/admet?smiles=`);
console.log(`  GET  /api/ord/literature?q=&limit=`);
console.log(`  GET  /api/ord/datasets`);
console.log(`  GET  /api/ord/stats`);

Bun.serve({ port: PORT, fetch: app.fetch, idleTimeout: 180 });

process.on("SIGINT", () => {
  console.log("\n[synthegy-ord] shutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("[synthegy-ord] received SIGTERM, shutting down...");
  process.exit(0);
});

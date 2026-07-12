// Synthegy bio microservice — port 3004.
// RCSB PDB + KEGG + OpenTargets + Google Patents.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestLogger, errorHandler, apiKeyAuth } from "./src/middleware/index.ts";
import { bio } from "./src/routes/bio.ts";
import "./src/cache.ts";

const PORT = 3004;
const app = new Hono();
app.use("*", cors());
app.use("*", requestLogger());
app.onError(errorHandler);
app.route("/health", bio);
app.use("/api/*", apiKeyAuth());
app.route("/api/bio", bio);
app.notFound((c) => c.json({ error: "not_found", message: `${c.req.method} ${c.req.path}` }, 404));

console.log(`[synthegy-bio] listening on http://localhost:${PORT}`);
console.log(`[synthegy-bio] data sources: RCSB PDB + KEGG + OpenTargets + Google Patents`);
console.log(`[synthegy-bio] routes:`);
console.log(`  GET  /health`);
console.log(`  GET  /api/bio/proteins/search?q=&limit=`);
console.log(`  GET  /api/bio/proteins/:pdbId`);
console.log(`  POST /api/bio/graph`);
console.log(`  GET  /api/bio/patents?q=&limit=`);
console.log(`  GET  /api/bio/stats`);

Bun.serve({ port: PORT, fetch: app.fetch, idleTimeout: 120 });

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

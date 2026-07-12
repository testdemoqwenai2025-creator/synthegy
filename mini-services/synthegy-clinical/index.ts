// Synthegy clinical microservice — port 3005.
// Synthetic patient cohort for Rheumatoid Arthritis.
// ALL DATA IS SYNTHETIC — designed for pipeline development.
// When real data becomes available, replace the generator with a CSV import.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestLogger, errorHandler, apiKeyAuth } from "./src/middleware/index.ts";
import { clinical } from "./src/routes/clinical.ts";
import "./src/store.ts";

const PORT = 3005;
const app = new Hono();
app.use("*", cors());
app.use("*", requestLogger());
app.onError(errorHandler);
app.route("/health", clinical);
app.use("/api/*", apiKeyAuth());
app.route("/api/clinical", clinical);
app.notFound((c) => c.json({ error: "not_found", message: `${c.req.method} ${c.req.path}` }, 404));

console.log(`[synthegy-clinical] listening on http://localhost:${PORT}`);
console.log(`[synthegy-clinical] disease: Rheumatoid Arthritis (ICD-10 M06.9)`);
console.log(`[synthegy-clinical] ALL PATIENT DATA IS SYNTHETIC`);
console.log(`[synthegy-clinical] routes:`);
console.log(`  GET  /health`);
console.log(`  POST /api/clinical/generate?n=50&force=true`);
console.log(`  GET  /api/clinical/patients`);
console.log(`  GET  /api/clinical/patients/:id`);
console.log(`  GET  /api/clinical/analysis`);
console.log(`  GET  /api/clinical/outcomes`);

Bun.serve({ port: PORT, fetch: app.fetch, idleTimeout: 60 });

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

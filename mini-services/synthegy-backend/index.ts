// Synthegy backend service — Bun + Hono on port 3001.
//
// Architecture:
//   [ Bun runtime ]
//      |
//      v
//   [ Hono app ]
//      |
//      +-- cors                    (permissive for demo; lock down in prod)
//      +-- requestLogger           (structured logs + request id)
//      +-- errorHandler            (catches all throws -> JSON)
//      +-- apiKeyAuth              (x-api-key header / ?apiKey= query)
//      +-- rateLimit               (token bucket per IP, SQLite-backed)
//      |
//      +-- /health                 (no auth, for smoke tests)
//      +-- /api/scenarios          (read seeded demo scenarios)
//      +-- /api/use-cases          (read seeded sector use cases)
//      +-- /api/sessions           (CRUD for chemist sessions)
//      +-- /api/evaluate           (LLM Strategic Evaluator + persist run)

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";

import { requestLogger } from "./src/middleware/logger.ts";
import { apiKeyAuth } from "./src/middleware/auth.ts";
import { rateLimit } from "./src/middleware/rateLimit.ts";
import { errorHandler } from "./src/middleware/errorHandler.ts";

import { health } from "./src/routes/health.ts";
import { scenarios } from "./src/routes/scenarios.ts";
import { useCases } from "./src/routes/useCases.ts";
import { sessions } from "./src/routes/sessions.ts";
import { evaluate } from "./src/routes/evaluate.ts";
import { collections } from "./src/routes/collections.ts";

import "./src/db.ts"; // initialise schema + seed

const PORT = 3001;

const app = new Hono();

// --- Global middleware (order matters) ---
app.use("*", cors());
app.use("*", honoLogger()); // tiny dev logger to stderr
app.use("*", requestLogger());
app.onError(errorHandler);

// Health is public (no auth, no rate limit)
app.route("/health", health);

// Everything under /api requires auth + rate limit
app.use("/api/*", apiKeyAuth());
app.use("/api/*", rateLimit());

// --- Routes ---
app.route("/api/scenarios", scenarios);
app.route("/api/use-cases", useCases);
app.route("/api/sessions", sessions);
app.route("/api/evaluate", evaluate);
app.route("/api/collections", collections);

// 404 for anything else
app.notFound((c) =>
  c.json({ error: "not_found", message: `Route ${c.req.method} ${c.req.path} not found` }, 404)
);

console.log(`[synthegy-backend] listening on http://localhost:${PORT}`);
console.log(`[synthegy-backend] demo api key: synthegy-demo-key`);
console.log(`[synthegy-backend] routes:`);
console.log(`  GET  /health`);
console.log(`  GET  /api/scenarios`);
console.log(`  GET  /api/scenarios/:id`);
console.log(`  GET  /api/use-cases?sector=`);
console.log(`  GET  /api/sessions`);
console.log(`  POST /api/sessions`);
console.log(`  GET  /api/sessions/:id`);
console.log(`  PATCH /api/sessions/:id`);
console.log(`  DELETE /api/sessions/:id`);
console.log(`  POST /api/evaluate`);
console.log(`  GET  /api/evaluate/:id`);
console.log(`  GET  /api/collections`);
console.log(`  POST /api/collections`);
console.log(`  GET  /api/collections/:id`);
console.log(`  PATCH /api/collections/:id`);
console.log(`  DELETE /api/collections/:id`);
console.log(`  POST /api/collections/:id/items`);
console.log(`  POST /api/collections/:id/items/bulk`);
console.log(`  DELETE /api/collections/:id/items/:cid`);

Bun.serve({ port: PORT, fetch: app.fetch });

// Keep the process alive and surface graceful shutdown.
process.on("SIGINT", () => {
  console.log("\n[synthegy-backend] shutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("[synthegy-backend] received SIGTERM, shutting down...");
  process.exit(0);
});

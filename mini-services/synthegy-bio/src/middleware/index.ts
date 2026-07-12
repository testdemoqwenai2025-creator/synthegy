// Middleware: shared auth + logger + error handler.
import type { MiddlewareHandler, ErrorHandler } from "hono";

const DEFAULT_KEY = "synthegy-demo-key";

export function apiKeyAuth(): MiddlewareHandler {
  const expected = process.env.SYNTHYGY_API_KEY?.trim() || DEFAULT_KEY;
  return async (c, next) => {
    if (c.req.path === "/health") { await next(); return; }
    const provided = c.req.header("x-api-key") || c.req.query("apiKey");
    if (!provided) return c.json({ error: "missing_api_key", message: "Demo key: synthegy-demo-key" }, 401);
    if (provided !== expected) return c.json({ error: "invalid_api_key" }, 403);
    await next();
  };
}

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const startedAt = Date.now();
    await next();
    if (c.req.path === "/health") return;
    console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.path} -> ${c.res.status} ${Date.now() - startedAt}ms`);
  };
}

export const errorHandler: ErrorHandler = (err, c) => {
  const msg = err instanceof Error ? err.message : "Unknown error";
  console.error(`[error] ${c.req.method} ${c.req.path}: ${msg}`);
  return c.json({ error: "internal_error", message: msg }, 500);
};

// Middleware: API-key auth (shared pattern).
import type { MiddlewareHandler } from "hono";

const DEFAULT_KEY = "synthegy-demo-key";

export function apiKeyAuth(): MiddlewareHandler {
  const expected = process.env.SYNTHYGY_API_KEY?.trim() || DEFAULT_KEY;
  return async (c, next) => {
    if (c.req.path === "/health") {
      await next();
      return;
    }
    const provided = c.req.header("x-api-key") || c.req.query("apiKey");
    if (!provided) {
      return c.json({ error: "missing_api_key", message: "Demo key: synthegy-demo-key" }, 401);
    }
    if (provided !== expected) {
      return c.json({ error: "invalid_api_key", message: "API key rejected." }, 403);
    }
    await next();
  };
}

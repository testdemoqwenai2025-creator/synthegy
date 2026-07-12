// Middleware: API-key auth (shared pattern with synthegy-backend).

import type { MiddlewareHandler } from "hono";

const DEFAULT_KEY = "synthegy-demo-key";

export function apiKeyAuth(): MiddlewareHandler {
  const expected = process.env.SYNTHYGY_API_KEY?.trim() || DEFAULT_KEY;
  return async (c, next) => {
    if (c.req.path === "/health") {
      await next();
      return;
    }
    const header = c.req.header("x-api-key");
    const query = c.req.query("apiKey");
    const provided = header || query;
    if (!provided) {
      return c.json(
        {
          error: "missing_api_key",
          message:
            "Provide an API key via the `x-api-key` header or `?apiKey=` query. Demo key: synthegy-demo-key",
        },
        401
      );
    }
    if (provided !== expected) {
      return c.json({ error: "invalid_api_key", message: "API key rejected." }, 403);
    }
    await next();
  };
}

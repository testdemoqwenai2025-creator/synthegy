// Middleware: request logger + error handler.
import type { MiddlewareHandler, ErrorHandler } from "hono";

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.req.header("x-request-id") || `ord_${crypto.randomUUID().slice(0, 8)}`;
    const startedAt = Date.now();
    c.header("x-request-id", requestId);
    await next();
    if (c.req.path === "/health") return;
    const latency = Date.now() - startedAt;
    console.log(
      `[${new Date().toISOString()}] ${c.req.method} ${c.req.path} -> ${c.res.status} ${latency}ms [${requestId}]`
    );
  };
}

export const errorHandler: ErrorHandler = (err, c) => {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error(`[error] ${c.req.method} ${c.req.path} -> 500: ${message}`);
  return c.json({ error: "internal_error", message }, 500);
};

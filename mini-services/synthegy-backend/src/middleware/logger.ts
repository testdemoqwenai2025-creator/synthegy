// Middleware: structured request logger.
// Logs method, path, status, latency, and a request id.
// Skips noise from /health on bun's hot-reload pings.

import type { MiddlewareHandler } from "hono";

export interface LogContext {
  requestId: string;
  startedAt: number;
}

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const requestId =
      c.req.header("x-request-id") ||
      `req_${crypto.randomUUID().slice(0, 8)}`;
    const startedAt = Date.now();
    c.set("logContext", { requestId, startedAt } satisfies LogContext);
    c.header("x-request-id", requestId);

    await next();

    const ctx = c.get("logContext") as LogContext | undefined;
    const latency = ctx ? Date.now() - ctx.startedAt : 0;
    const path = c.req.path;
    if (path === "/health") return; // quiet
    console.log(
      `[${new Date().toISOString()}] ${c.req.method} ${path} -> ${c.res.status} ${latency}ms [${requestId}]`
    );
  };
}

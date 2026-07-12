// Middleware: structured request logger.

import type { MiddlewareHandler } from "hono";

export interface LogContext {
  requestId: string;
  startedAt: number;
}

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const requestId =
      c.req.header("x-request-id") || `mol_${crypto.randomUUID().slice(0, 8)}`;
    const startedAt = Date.now();
    c.set("logContext", { requestId, startedAt } satisfies LogContext);
    c.header("x-request-id", requestId);
    await next();
    const ctx = c.get("logContext") as LogContext | undefined;
    const latency = ctx ? Date.now() - ctx.startedAt : 0;
    if (c.req.path === "/health") return;
    console.log(
      `[${new Date().toISOString()}] ${c.req.method} ${c.req.path} -> ${c.res.status} ${latency}ms [${requestId}]`
    );
  };
}

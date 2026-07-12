// Middleware: global error handler.

import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  const isDev = process.env.NODE_ENV === "development";
  const message = err instanceof Error ? err.message : "Unknown error";
  const status =
    typeof (err as { status?: number }).status === "number"
      ? (err as { status: number }).status
      : 500;
  console.error(`[error] ${c.req.method} ${c.req.path} -> ${status}: ${message}`);
  return c.json(
    {
      error: status === 500 ? "internal_error" : "request_error",
      message,
      ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
    },
    status
  );
};

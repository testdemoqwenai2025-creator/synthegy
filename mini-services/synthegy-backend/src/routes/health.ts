// GET /health — liveness probe. No auth required.

import { Hono } from "hono";

export const health = new Hono();

health.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "synthegy-backend",
    version: "1.0.0",
    time: new Date().toISOString(),
    uptime_sec: Math.round(process.uptime()),
  });
});

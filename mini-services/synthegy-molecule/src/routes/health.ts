// GET /health — liveness probe.

import { Hono } from "hono";

export const health = new Hono();

health.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "synthegy-molecule",
    version: "1.0.0",
    description: "PubChem-backed molecular intelligence microservice",
    data_source: "https://pubchem.ncbi.nlm.nih.gov/rest/pug",
    time: new Date().toISOString(),
    uptime_sec: Math.round(process.uptime()),
  });
});

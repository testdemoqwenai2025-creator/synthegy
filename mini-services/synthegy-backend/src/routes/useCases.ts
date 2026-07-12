// /use-cases — read-only list of sector use cases served from SQLite.

import { Hono } from "hono";
import { db } from "../db";

export const useCases = new Hono();

interface UseCaseRow {
  id: string;
  sector: string;
  title: string;
  summary: string;
  outcome: string;
  metrics_json: string;
}

useCases.get("/", (c) => {
  const sector = c.req.query("sector");
  let rows: UseCaseRow[];
  if (sector) {
    rows = db
      .prepare(
        `SELECT id, sector, title, summary, outcome, metrics_json
         FROM use_cases WHERE sector = ? ORDER BY id`
      )
      .all(sector) as UseCaseRow[];
  } else {
    rows = db
      .prepare(
        `SELECT id, sector, title, summary, outcome, metrics_json
         FROM use_cases ORDER BY id`
      )
      .all() as UseCaseRow[];
  }

  return c.json({
    count: rows.length,
    sectors: ["Pharmaceuticals", "Materials Science", "Agrochemicals", "Fine Chemicals"],
    useCases: rows.map((r) => ({
      id: r.id,
      sector: r.sector,
      title: r.title,
      summary: r.summary,
      outcome: r.outcome,
      metrics: JSON.parse(r.metrics_json),
    })),
  });
});

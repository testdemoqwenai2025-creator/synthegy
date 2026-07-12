// /scenarios — read-only list of demo scenarios served from SQLite.

import { Hono } from "hono";
import { db } from "../db";

export const scenarios = new Hono();

interface ScenarioRow {
  id: string;
  workflow_id: string;
  title: string;
  target: string;
  smiles: string;
  instruction: string;
  steps_json: string;
  verdict: string;
}

scenarios.get("/", (c) => {
  const rows = db
    .prepare(
      `SELECT id, workflow_id, title, target, smiles, instruction, steps_json, verdict
       FROM scenarios ORDER BY id`
    )
    .all() as ScenarioRow[];

  return c.json({
    count: rows.length,
    scenarios: rows.map((r) => ({
      id: r.id,
      workflowId: r.workflow_id,
      title: r.title,
      target: r.target,
      smiles: r.smiles,
      instruction: r.instruction,
      steps: JSON.parse(r.steps_json),
      verdict: r.verdict,
    })),
  });
});

scenarios.get("/:id", (c) => {
  const row = db
    .prepare(
      `SELECT id, workflow_id, title, target, smiles, instruction, steps_json, verdict
       FROM scenarios WHERE id = ?`
    )
    .get(c.req.param("id")) as ScenarioRow | null;

  if (!row) {
    return c.json({ error: "not_found", message: "Scenario not found." }, 404);
  }
  return c.json({
    scenario: {
      id: row.id,
      workflowId: row.workflow_id,
      title: row.title,
      target: row.target,
      smiles: row.smiles,
      instruction: row.instruction,
      steps: JSON.parse(row.steps_json),
      verdict: row.verdict,
    },
  });
});

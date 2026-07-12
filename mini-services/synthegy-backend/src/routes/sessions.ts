// /sessions — CRUD for chemist sessions.
// A session groups related evaluator runs (e.g. one per route-design project).

import { Hono } from "hono";
import { z } from "zod";
import { db, newId, type SessionRow, type RunRow } from "../db";

export const sessions = new Hono();

const CreateBody = z.object({
  label: z.string().min(1).max(120),
  chemistId: z.string().max(100).optional(),
});

const UpdateBody = z.object({
  label: z.string().min(1).max(120).optional(),
});

// List sessions, newest first.
sessions.get("/", (c) => {
  const rows = db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM runs r WHERE r.session_id = s.id) AS run_count
       FROM sessions s ORDER BY s.updated_at DESC LIMIT 100`
    )
    .all() as (SessionRow & { run_count: number })[];

  return c.json({
    count: rows.length,
    sessions: rows.map((r) => ({
      id: r.id,
      label: r.label,
      chemistId: r.chemist_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      runCount: r.run_count,
    })),
  });
});

// Create session
sessions.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const now = Date.now();
  const id = newId("sess");
  db.prepare(
    `INSERT INTO sessions (id, label, chemist_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, parsed.data.label, parsed.data.chemistId ?? null, now, now);

  return c.json(
    {
      session: {
        id,
        label: parsed.data.label,
        chemistId: parsed.data.chemistId ?? null,
        createdAt: now,
        updatedAt: now,
        runCount: 0,
      },
    },
    201
  );
});

// Get one session with its runs
sessions.get("/:id", (c) => {
  const id = c.req.param("id");
  const sess = db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(id) as SessionRow | null;
  if (!sess) {
    return c.json({ error: "not_found", message: "Session not found." }, 404);
  }
  const runs = db
    .prepare(
      `SELECT * FROM runs WHERE session_id = ? ORDER BY created_at DESC LIMIT 200`
    )
    .all(id) as RunRow[];

  return c.json({
    session: {
      id: sess.id,
      label: sess.label,
      chemistId: sess.chemist_id,
      createdAt: sess.created_at,
      updatedAt: sess.updated_at,
    },
    runs: runs.map(runRowToApi),
  });
});

// Update session label
sessions.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = UpdateBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const now = Date.now();
  const result = db
    .prepare(`UPDATE sessions SET label = ?, updated_at = ? WHERE id = ?`)
    .run(parsed.data.label ?? null, now, id);
  if (result.changes === 0) {
    return c.json({ error: "not_found", message: "Session not found." }, 404);
  }
  return c.json({ ok: true, updatedAt: now });
});

// Delete session (cascades to runs via FK)
sessions.delete("/:id", (c) => {
  const id = c.req.param("id");
  const result = db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  if (result.changes === 0) {
    return c.json({ error: "not_found", message: "Session not found." }, 404);
  }
  return c.json({ ok: true });
});

// Helper: shape a run row for the API
function runRowToApi(r: RunRow) {
  return {
    id: r.id,
    sessionId: r.session_id,
    workflowId: r.workflow_id,
    target: r.target,
    smiles: r.smiles,
    instruction: r.instruction,
    score: r.score,
    verdict: r.verdict,
    strategyAlignment: r.strategy_alignment,
    oneLineSummary: r.one_line_summary,
    flags: r.flags_json ? JSON.parse(r.flags_json) : [],
    latencyMs: r.latency_ms,
    createdAt: r.created_at,
  };
}

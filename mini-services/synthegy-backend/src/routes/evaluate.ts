// /evaluate — the headline endpoint. Calls the LLM Strategic Evaluator and
// persists the run to a session. If no sessionId is provided, the run is
// attached to an "ad-hoc" session created on the fly.

import { Hono } from "hono";
import { z } from "zod";
import { db, newId, type RunRow } from "../db";
import { runEvaluator } from "../lib/llm";

export const evaluate = new Hono();

const Body = z.object({
  target: z.string().max(200).optional().default(""),
  smiles: z.string().max(2000).optional().default(""),
  instruction: z.string().min(1).max(2000),
  workflowId: z
    .enum(["retrosynthesis", "mechanism", "alignment"])
    .optional()
    .default("retrosynthesis"),
  sessionId: z.string().max(100).optional(),
  enrichedContext: z
    .object({
      source: z.literal("pubchem"),
      cid: z.number().optional(),
      molecularFormula: z.string().optional(),
      molecularWeight: z.string().optional(),
      canonicalSMILES: z.string().optional(),
      iupacName: z.string().optional(),
      xLogP: z.number().optional(),
      tpsa: z.number().optional(),
      rotatableBondCount: z.number().optional(),
      heavyAtomCount: z.number().optional(),
      complexity: z.number().optional(),
      synonyms: z.array(z.string()).max(20).optional(),
      description: z.string().max(2000).optional(),
    })
    .optional(),
});

evaluate.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const req = parsed.data;

  // Resolve session — create an ad-hoc one if none provided.
  let sessionId = req.sessionId;
  if (!sessionId) {
    const now = Date.now();
    sessionId = newId("sess");
    db.prepare(
      `INSERT INTO sessions (id, label, chemist_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
    ).run(sessionId, "Ad-hoc session", null, now, now);
  } else {
    const exists = db
      .prepare(`SELECT id FROM sessions WHERE id = ?`)
      .get(sessionId);
    if (!exists) {
      return c.json({ error: "not_found", message: "Session not found." }, 404);
    }
  }

  // Run the LLM evaluator.
  let llmResult;
  try {
    llmResult = await runEvaluator({
      target: req.target,
      smiles: req.smiles,
      instruction: req.instruction,
      enrichedContext: req.enrichedContext,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM call failed";
    return c.json({ error: "evaluator_failed", message }, 502);
  }

  // Persist the run.
  const runId = newId("run");
  const now = Date.now();
  db.prepare(
    `INSERT INTO runs (
       id, session_id, workflow_id, target, smiles, instruction,
       score, verdict, strategy_alignment, one_line_summary,
       flags_json, raw_json, latency_ms, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    runId,
    sessionId,
    req.workflowId,
    req.target || null,
    req.smiles || null,
    req.instruction,
    llmResult.result.score,
    llmResult.result.verdict,
    llmResult.result.strategyAlignment,
    llmResult.result.oneLineSummary,
    JSON.stringify(llmResult.result.flags),
    llmResult.raw,
    llmResult.latencyMs,
    now
  );

  // Bump session updated_at
  db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`).run(now, sessionId);

  return c.json({
    runId,
    sessionId,
    createdAt: now,
    latencyMs: llmResult.latencyMs,
    result: llmResult.result,
  });
});

// GET /evaluate/:id — retrieve a persisted run by id
evaluate.get("/:id", (c) => {
  const row = db
    .prepare(`SELECT * FROM runs WHERE id = ?`)
    .get(c.req.param("id")) as RunRow | null;
  if (!row) {
    return c.json({ error: "not_found", message: "Run not found." }, 404);
  }
  return c.json({
    run: {
      id: row.id,
      sessionId: row.session_id,
      workflowId: row.workflow_id,
      target: row.target,
      smiles: row.smiles,
      instruction: row.instruction,
      score: row.score,
      verdict: row.verdict,
      strategyAlignment: row.strategy_alignment,
      oneLineSummary: row.one_line_summary,
      flags: row.flags_json ? JSON.parse(row.flags_json) : [],
      latencyMs: row.latency_ms,
      createdAt: row.created_at,
    },
  });
});

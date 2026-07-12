// /api/feedback — active learning loop.
//
// Records chemist accept/revise/reject signals on evaluator runs.
// Aggregates them into a "preference profile" that biases the evaluator's
// system prompt toward patterns the chemist has historically preferred.

import { Hono } from "hono";
import { z } from "zod";
import { db, newId } from "../db.ts";

export const feedback = new Hono();

const FeedbackBody = z.object({
  runId: z.string().min(1).max(100),
  signal: z.enum(["accept", "revise", "reject"]),
  chemistId: z.string().max(100).optional(),
  note: z.string().max(2000).optional(),
});

// POST / — record feedback on a run
feedback.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = FeedbackBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
  }
  const { runId, signal, chemistId, note } = parsed.data;

  // Verify the run exists
  const run = db.prepare(`SELECT id, verdict, score FROM runs WHERE id = ?`).get(runId);
  if (!run) {
    return c.json({ error: "not_found", message: "Run not found." }, 404);
  }

  const id = newId("fb");
  const now = Date.now();
  try {
    db.prepare(
      `INSERT INTO feedback (id, run_id, signal, chemist_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, runId, signal, chemistId ?? null, note ?? null, now);
  } catch {
    // UNIQUE(run_id) — feedback already exists, update it
    db.prepare(
      `UPDATE feedback SET signal = ?, chemist_id = ?, note = ?, created_at = ? WHERE run_id = ?`
    ).run(signal, chemistId ?? null, note ?? null, now, runId);
  }

  return c.json({ ok: true, id, runId, signal, recordedAt: now });
});

// GET /stats — aggregate feedback statistics
feedback.get("/stats", (c) => {
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM feedback`).get() as { c: number }).c;
  const bySignal = db
    .prepare(`SELECT signal, COUNT(*) AS c FROM feedback GROUP BY signal`)
    .all() as { signal: string; c: number }[];

  // Correlation: how often does the evaluator's verdict match chemist feedback?
  const matching = db.prepare(`
    SELECT
      f.signal,
      r.verdict,
      COUNT(*) AS c,
      AVG(r.score) AS avg_score
    FROM feedback f
    JOIN runs r ON f.run_id = r.id
    GROUP BY f.signal, r.verdict
  `).all() as { signal: string; verdict: string; c: number; avg_score: number }[];

  // Compute agreement rate: evaluator "accept" + chemist "accept" OR evaluator "revise/reject" + chemist "revise/reject"
  const agreementCount = matching.filter(m =>
    (m.signal === "accept" && m.verdict === "accept") ||
    (m.signal !== "accept" && m.verdict !== "accept")
  ).reduce((sum, m) => sum + m.c, 0);

  const agreementRate = total > 0 ? agreementCount / total : 0;

  return c.json({
    totalFeedback: total,
    bySignal: bySignal.reduce((acc, s) => { acc[s.signal] = s.c; return acc; }, {} as Record<string, number>),
    agreementRate: Math.round(agreementRate * 100) / 100,
    correlation: matching.map(m => ({
      chemistSignal: m.signal,
      evaluatorVerdict: m.verdict,
      count: m.c,
      avgScore: Math.round(m.avg_score * 100) / 100,
    })),
  });
});

// GET /profile — the accumulated "preference profile"
// Returns insights the evaluator can use to bias future runs.
feedback.get("/profile", (c) => {
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM feedback`).get() as { c: number }).c;
  if (total === 0) {
    return c.json({
      totalFeedback: 0,
      profile: "No feedback yet. Record accept/revise signals on evaluator runs to build a preference profile.",
      insights: [],
    });
  }

  // What instructions tend to get accepted vs revised?
  const instructionStats = db.prepare(`
    SELECT
      r.instruction,
      f.signal,
      r.score
    FROM feedback f
    JOIN runs r ON f.run_id = r.id
  `).all() as { instruction: string; signal: string; score: number }[];

  // Group by signal
  const accepted = instructionStats.filter(s => s.signal === "accept");
  const revised = instructionStats.filter(s => s.signal === "revise");
  const rejected = instructionStats.filter(s => s.signal === "reject");

  // Common keywords in accepted vs revised instructions
  const acceptedKeywords = extractKeywords(accepted.map(s => s.instruction));
  const revisedKeywords = extractKeywords(revised.map(s => s.instruction));

  const avgAcceptedScore = accepted.length > 0
    ? accepted.reduce((sum, s) => sum + s.score, 0) / accepted.length
    : 0;
  const avgRevisedScore = revised.length > 0
    ? revised.reduce((sum, s) => sum + s.score, 0) / revised.length
    : 0;

  const insights: string[] = [];
  if (accepted.length > 0) {
    insights.push(`${accepted.length} runs accepted (avg evaluator score: ${avgAcceptedScore.toFixed(2)})`);
  }
  if (revised.length > 0) {
    insights.push(`${revised.length} runs revised (avg evaluator score: ${avgRevisedScore.toFixed(2)})`);
  }
  if (rejected.length > 0) {
    insights.push(`${rejected.length} runs rejected`);
  }
  if (acceptedKeywords.length > 0) {
    insights.push(`Chemist prefers instructions mentioning: ${acceptedKeywords.slice(0, 5).join(", ")}`);
  }
  if (revisedKeywords.length > 0) {
    insights.push(`Chemist tends to revise when instructions mention: ${revisedKeywords.slice(0, 5).join(", ")}`);
  }

  const profile = `${total} feedback signals recorded. ` +
    `Agreement rate with evaluator: ${insights.find(i => i.includes("accepted")) ?? "n/a"}. ` +
    `The evaluator ${avgAcceptedScore > avgRevisedScore ? "correctly" : "incorrect"}ly scores accepted routes higher than revised ones ` +
    `(Δ = ${(avgAcceptedScore - avgRevisedScore).toFixed(2)}).`;

  return c.json({
    totalFeedback: total,
    accepted: accepted.length,
    revised: revised.length,
    rejected: rejected.length,
    avgAcceptedScore: Math.round(avgAcceptedScore * 100) / 100,
    avgRevisedScore: Math.round(avgRevisedScore * 100) / 100,
    acceptedKeywords,
    revisedKeywords,
    insights,
    profile,
  });
});

function extractKeywords(instructions: string[]): string[] {
  const stopWords = new Set(["avoid", "prefer", "the", "and", "for", "with", "a", "an", "to", "in", "of", "no", "must", "be"]);
  const freq = new Map<string, number>();
  for (const inst of instructions) {
    for (const word of inst.toLowerCase().split(/[\s,.]+/)) {
      if (word.length < 3 || stopWords.has(word)) continue;
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

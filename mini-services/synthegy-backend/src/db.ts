// SQLite database for the Synthegy backend.
// Uses bun:sqlite (built-in) — no external process, no migrations to run.
// Schema is initialised on boot; seed data is inserted if tables are empty.

import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { seedScenarios, seedUseCases } from "./data/seed.ts";

const DB_PATH = resolve(import.meta.dir, "..", "synthegy.db");

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// --- Schema -----------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    chemist_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    workflow_id TEXT NOT NULL,
    target TEXT,
    smiles TEXT,
    instruction TEXT NOT NULL,
    score REAL,
    verdict TEXT,
    strategy_alignment TEXT,
    one_line_summary TEXT,
    flags_json TEXT,            -- JSON array of {step, issue, suggestion}
    raw_json TEXT,              -- full LLM response, kept for audit
    latency_ms INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(session_id);
  CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);

  CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    title TEXT NOT NULL,
    target TEXT NOT NULL,
    smiles TEXT NOT NULL,
    instruction TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    verdict TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS use_cases (
    id TEXT PRIMARY KEY,
    sector TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    outcome TEXT NOT NULL,
    metrics_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    tokens REAL NOT NULL,
    last_refill INTEGER NOT NULL
  );
`);

// --- Seed -------------------------------------------------------------------

function tableEmpty(name: string): boolean {
  const row = db.query(`SELECT COUNT(*) AS c FROM ${name}`).get() as { c: number };
  return row.c === 0;
}

if (tableEmpty("scenarios")) {
  const insert = db.prepare(
    `INSERT INTO scenarios (id, workflow_id, title, target, smiles, instruction, steps_json, verdict)
     VALUES ($id, $workflow_id, $title, $target, $smiles, $instruction, $steps_json, $verdict)`
  );
  for (const s of seedScenarios) {
    insert.run({
      $id: s.id,
      $workflow_id: s.workflowId,
      $title: s.title,
      $target: s.target,
      $smiles: s.smiles,
      $instruction: s.instruction,
      $steps_json: JSON.stringify(s.steps),
      $verdict: s.verdict,
    });
  }
  console.log(`[db] seeded ${seedScenarios.length} scenarios`);
}

if (tableEmpty("use_cases")) {
  const insert = db.prepare(
    `INSERT INTO use_cases (id, sector, title, summary, outcome, metrics_json)
     VALUES ($id, $sector, $title, $summary, $outcome, $metrics_json)`
  );
  for (const u of seedUseCases) {
    insert.run({
      $id: u.id,
      $sector: u.sector,
      $title: u.title,
      $summary: u.summary,
      $outcome: u.outcome,
      $metrics_json: JSON.stringify(u.metrics),
    });
  }
  console.log(`[db] seeded ${seedUseCases.length} use cases`);
}

// --- Helpers ----------------------------------------------------------------

export interface SessionRow {
  id: string;
  label: string;
  chemist_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface RunRow {
  id: string;
  session_id: string;
  workflow_id: string;
  target: string | null;
  smiles: string | null;
  instruction: string;
  score: number | null;
  verdict: string | null;
  strategy_alignment: string | null;
  one_line_summary: string | null;
  flags_json: string | null;
  raw_json: string | null;
  latency_ms: number | null;
  created_at: number;
}

export function newId(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(rand)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

export { db };

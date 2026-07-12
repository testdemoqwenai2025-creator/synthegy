// SQLite-backed cache for the ORD service.
// Mirrors the pattern used by the molecule service.

import { Database } from "bun:sqlite";
import { resolve } from "node:path";

const DB_PATH = resolve(import.meta.dir, "..", "synthegy-ord.db");
const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    payload TEXT,
    created_at INTEGER NOT NULL,
    ttl_ms INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cache_kind ON cache(kind);
  CREATE INDEX IF NOT EXISTS idx_cache_created ON cache(created_at);
`);

const stmtGet = db.prepare(`SELECT * FROM cache WHERE key = ?`);
const stmtSet = db.prepare(
  `INSERT INTO cache (key, kind, payload, created_at, ttl_ms)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET
     kind = excluded.kind,
     payload = excluded.payload,
     created_at = excluded.created_at,
     ttl_ms = excluded.ttl_ms`
);
const stmtDel = db.prepare(`DELETE FROM cache WHERE key = ?`);

export const TTL = {
  REACTIONS: 30 * 24 * 60 * 60 * 1000, // 30 days — reactions don't change
  ADMET: 30 * 24 * 60 * 60 * 1000, // 30 days — descriptors are deterministic
  LITERATURE: 7 * 24 * 60 * 60 * 1000, // 7 days — new papers appear
  NEGATIVE: 60 * 60 * 1000, // 1 hour
} as const;

export function cacheGet<T>(key: string): T | null {
  const row = stmtGet.get(key) as
    | { kind: string; payload: string | null; created_at: number; ttl_ms: number }
    | null;
  if (!row) return null;
  const age = Date.now() - row.created_at;
  if (age > row.ttl_ms) {
    stmtDel.run(key);
    return null;
  }
  if (!row.payload) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export function cacheSet<T>(
  key: string,
  value: T,
  opts: { ttlMs: number; kind: string }
): void {
  stmtSet.run(key, opts.kind, JSON.stringify(value), Date.now(), opts.ttlMs);
}

export function cacheStats() {
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM cache`).get() as { c: number }).c;
  const byKind = db
    .prepare(`SELECT kind, COUNT(*) AS c FROM cache GROUP BY kind`)
    .all() as { kind: string; c: number }[];
  return { total, byKind };
}

export { db };

// SQLite-backed cache for the molecule service.
//
// Caches PubChem compound property responses, synonyms, descriptions, and
// search results to avoid hammering PubChem's REST API on repeated lookups.
//
// TTL strategy:
//   - Properties (formula, weight, SMILES, InChIKey): 30 days (these never change)
//   - Synonyms: 7 days (rarely change)
//   - Descriptions: 30 days (text rarely changes)
//   - Search results: 24 hours (new compounds appear)
//   - Image: 30 days (structure is immutable)
//   - Negative lookups (404): 1 hour (avoid hammering for non-existent names)

import { Database } from "bun:sqlite";
import { resolve } from "node:path";

const DB_PATH = resolve(import.meta.dir, "..", "synthegy-molecule.db");

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    kind TEXT NOT NULL,           -- 'properties' | 'synonyms' | 'description' | 'search' | 'image' | 'negative'
    payload TEXT,                  -- JSON string (NULL for images / negatives)
    image_blob BLOB,               -- PNG bytes for image cache
    content_type TEXT,
    created_at INTEGER NOT NULL,
    ttl_ms INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cache_kind ON cache(kind);
  CREATE INDEX IF NOT EXISTS idx_cache_created ON cache(created_at);
`);

export interface CacheEntry {
  key: string;
  kind: string;
  payload: string | null;
  image_blob: Uint8Array | null;
  content_type: string | null;
  created_at: number;
  ttl_ms: number;
}

const stmtGet = db.prepare(`SELECT * FROM cache WHERE key = ?`);
const stmtSet = db.prepare(
  `INSERT INTO cache (key, kind, payload, image_blob, content_type, created_at, ttl_ms)
   VALUES (?, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET
     kind = excluded.kind,
     payload = excluded.payload,
     image_blob = excluded.image_blob,
     content_type = excluded.content_type,
     created_at = excluded.created_at,
     ttl_ms = excluded.ttl_ms`
);
const stmtDel = db.prepare(`DELETE FROM cache WHERE key = ?`);

export interface CacheOptions {
  ttlMs: number;
  kind: string;
}

export const TTL = {
  PROPERTIES: 30 * 24 * 60 * 60 * 1000, // 30 days
  SYNONYMS: 7 * 24 * 60 * 60 * 1000, // 7 days
  DESCRIPTION: 30 * 24 * 60 * 60 * 1000, // 30 days
  SEARCH: 24 * 60 * 60 * 1000, // 24 hours
  IMAGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  NEGATIVE: 60 * 60 * 1000, // 1 hour
} as const;

export function cacheGet<T>(key: string): T | null {
  const row = stmtGet.get(key) as CacheEntry | null;
  if (!row) return null;
  const age = Date.now() - row.created_at;
  if (age > row.ttl_ms) {
    stmtDel.run(key);
    return null;
  }
  if (row.kind === "negative") return null;
  if (!row.payload) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export function cacheGetImage(key: string): { blob: Uint8Array; contentType: string } | null {
  const row = stmtGet.get(key) as CacheEntry | null;
  if (!row || row.kind !== "image" || !row.image_blob) return null;
  const age = Date.now() - row.created_at;
  if (age > row.ttl_ms) {
    stmtDel.run(key);
    return null;
  }
  return { blob: row.image_blob, contentType: row.content_type || "image/png" };
}

export function cacheSet<T>(key: string, value: T, opts: CacheOptions): void {
  stmtSet.run(
    key,
    opts.kind,
    JSON.stringify(value),
    null,
    null,
    Date.now(),
    opts.ttlMs
  );
}

export function cacheSetImage(
  key: string,
  blob: Uint8Array,
  contentType: string,
  ttlMs: number = TTL.IMAGE
): void {
  stmtSet.run(key, "image", null, blob, contentType, Date.now(), ttlMs);
}

export function cacheSetNegative(key: string, ttlMs: number = TTL.NEGATIVE): void {
  stmtSet.run(key, "negative", null, null, null, Date.now(), ttlMs);
}

export function cacheStats() {
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM cache`).get() as { c: number }).c;
  const byKind = db
    .prepare(`SELECT kind, COUNT(*) AS c FROM cache GROUP BY kind`)
    .all() as { kind: string; c: number }[];
  return { total, byKind };
}

export function cacheClearExpired(): number {
  const now = Date.now();
  const result = db.prepare(`DELETE FROM cache WHERE created_at + ttl_ms < ?`).run(now);
  return result.changes;
}

export { db };

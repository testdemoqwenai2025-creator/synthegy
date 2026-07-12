// Middleware: token-bucket rate limiter, persisted in SQLite.
//
// Per-IP bucket. Defaults: capacity 20 tokens, refill 10 tokens/min.
// Tunable via env: RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL_PER_MIN.
//
// Returns 429 with a Retry-After header when the bucket is empty.

import type { MiddlewareHandler } from "hono";
import { db } from "../db";

const CAPACITY = Number(process.env.RATE_LIMIT_CAPACITY ?? 20);
const REFILL_PER_MIN = Number(process.env.RATE_LIMIT_REFILL_PER_MIN ?? 10);
const REFILL_PER_MS = REFILL_PER_MIN / 60_000;

export function rateLimit(): MiddlewareHandler {
  // Prepare statement once on registration.
  const select = db.prepare(
    `SELECT tokens, last_refill FROM rate_limits WHERE key = ?`
  );
  const upsert = db.prepare(
    `INSERT INTO rate_limits (key, tokens, last_refill) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET tokens = excluded.tokens, last_refill = excluded.last_refill`
  );

  return async (c, next) => {
    if (c.req.path === "/health") {
      await next();
      return;
    }
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      "unknown";
    const key = `ip:${ip}`;
    const now = Date.now();

    const row = select.get(key) as { tokens: number; last_refill: number } | null;
    let tokens: number;
    let lastRefill: number;
    if (row) {
      const elapsed = now - row.last_refill;
      tokens = Math.min(CAPACITY, row.tokens + elapsed * REFILL_PER_MS);
      lastRefill = now;
    } else {
      tokens = CAPACITY;
      lastRefill = now;
    }

    if (tokens < 1) {
      const retryAfterSec = Math.ceil((1 - tokens) / REFILL_PER_MS / 1000);
      c.header("Retry-After", String(retryAfterSec));
      c.header("X-RateLimit-Limit", String(CAPACITY));
      c.header("X-RateLimit-Remaining", "0");
      return c.json(
        {
          error: "rate_limited",
          message: `Too many requests. Retry in ${retryAfterSec}s.`,
          retryAfterSec,
        },
        429
      );
    }

    tokens -= 1;
    upsert.run(key, tokens, lastRefill);
    c.header("X-RateLimit-Limit", String(CAPACITY));
    c.header("X-RateLimit-Remaining", String(Math.floor(tokens)));
    await next();
  };
}

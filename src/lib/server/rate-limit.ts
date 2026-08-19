import type { RowDataPacket } from "mysql2/promise";
import { isMysqlUsable, mysqlExecute, mysqlQueryOne, newId, toMysqlDateTime } from "./mysql";

const hits = new Map<string, number[]>();

function memoryPeek(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number; count: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
  hits.set(key, recent);
  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      count: recent.length,
    };
  }
  return { ok: true, retryAfterSec: 0, count: recent.length };
}

function memoryRecord(key: string, windowMs: number): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
  recent.push(now);
  hits.set(key, recent);
}

/** Simple sliding-window rate limit (process-local). Records a hit. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const peek = memoryPeek(key, limit, windowMs);
  if (!peek.ok) return peek;
  memoryRecord(key, windowMs);
  return { ok: true, retryAfterSec: 0 };
}

let tableReady = false;

async function ensureRateLimitTable(): Promise<boolean> {
  if (!isMysqlUsable()) return false;
  if (tableReady) return true;
  try {
    await mysqlExecute(
      `CREATE TABLE IF NOT EXISTS rate_limit_hits (
        id VARCHAR(36) PRIMARY KEY,
        bucket_key VARCHAR(191) NOT NULL,
        hit_at DATETIME(3) NOT NULL,
        KEY rate_limit_hits_bucket_idx (bucket_key, hit_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    tableReady = true;
    return true;
  } catch (error) {
    console.error(
      "[rate-limit] ensure table failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

async function mysqlPeek(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number } | null> {
  if (!(await ensureRateLimitTable())) return null;
  try {
    const since = toMysqlDateTime(new Date(Date.now() - windowMs).toISOString());
    const row = await mysqlQueryOne<RowDataPacket>(
      `SELECT COUNT(*) AS count,
              MIN(hit_at) AS oldest
       FROM rate_limit_hits
       WHERE bucket_key = ? AND hit_at >= ?`,
      [key, since],
    );
    const count = Number(row?.count ?? 0);
    if (count >= limit) {
      const oldestMs = row?.oldest
        ? new Date(String(row.oldest)).getTime()
        : Date.now();
      return {
        ok: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((oldestMs + windowMs - Date.now()) / 1000),
        ),
      };
    }
    return { ok: true, retryAfterSec: 0 };
  } catch (error) {
    console.error(
      "[rate-limit] mysql peek failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * Check limit without consuming a slot.
 * Prefer MySQL when available; fall back to process memory.
 */
export async function peekRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const mysql = await mysqlPeek(key, limit, windowMs);
  if (mysql) return mysql;
  return memoryPeek(key, limit, windowMs);
}

/** Record one hit after a successful / billable action. */
export async function recordRateLimitHitAsync(
  key: string,
  windowMs: number,
): Promise<void> {
  if (await ensureRateLimitTable()) {
    try {
      const since = toMysqlDateTime(new Date(Date.now() - windowMs).toISOString());
      await mysqlExecute(
        `INSERT INTO rate_limit_hits (id, bucket_key, hit_at) VALUES (?, ?, ?)`,
        [newId(), key, toMysqlDateTime(new Date().toISOString())],
      );
      void mysqlExecute(
        `DELETE FROM rate_limit_hits WHERE hit_at < ? LIMIT 500`,
        [since],
      ).catch(() => undefined);
      return;
    } catch (error) {
      console.error(
        "[rate-limit] mysql record failed, using memory:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  memoryRecord(key, windowMs);
}

/**
 * Peek + record in one call (legacy / request-flood guards).
 * Safe for multi-instance when MySQL is up.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const peek = await peekRateLimitAsync(key, limit, windowMs);
  if (!peek.ok) return peek;
  await recordRateLimitHitAsync(key, windowMs);
  return { ok: true, retryAfterSec: 0 };
}

/** @internal */
export function __resetRateLimitMemoryForTests(): void {
  hits.clear();
  tableReady = false;
}

export { getTrustedClientIp, getClientIp } from "./client-ip";

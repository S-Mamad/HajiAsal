import type { RowDataPacket } from "mysql2/promise";
import { isMysqlConfigured, mysqlExecute, mysqlQueryOne, newId } from "./mysql";

const hits = new Map<string, number[]>();

/** Simple sliding-window rate limit (process-local). */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    hits.set(key, recent);
    return { ok: false, retryAfterSec };
  }

  recent.push(now);
  hits.set(key, recent);
  return { ok: true, retryAfterSec: 0 };
}

let tableReady = false;

async function ensureRateLimitTable(): Promise<boolean> {
  if (!isMysqlConfigured()) return false;
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

/**
 * Durable sliding-window rate limit when MySQL is configured; otherwise memory.
 * Safe for multi-instance production OTP / order / track endpoints.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  if (await ensureRateLimitTable()) {
    try {
      const since = new Date(Date.now() - windowMs).toISOString();
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
        const retryAfterSec = Math.max(
          1,
          Math.ceil((oldestMs + windowMs - Date.now()) / 1000),
        );
        return { ok: false, retryAfterSec };
      }
      await mysqlExecute(
        `INSERT INTO rate_limit_hits (id, bucket_key, hit_at) VALUES (?, ?, ?)`,
        [newId(), key, new Date().toISOString()],
      );
      // Best-effort prune (ignore failures)
      void mysqlExecute(
        `DELETE FROM rate_limit_hits WHERE hit_at < ? LIMIT 500`,
        [since],
      ).catch(() => undefined);
      return { ok: true, retryAfterSec: 0 };
    } catch (error) {
      console.error(
        "[rate-limit] mysql path failed, using memory:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return checkRateLimit(key, limit, windowMs);
}

/** @internal */
export function __resetRateLimitMemoryForTests(): void {
  hits.clear();
  tableReady = false;
}

export { getTrustedClientIp, getClientIp } from "./client-ip";

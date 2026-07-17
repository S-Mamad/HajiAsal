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

export { getTrustedClientIp, getClientIp } from "./client-ip";

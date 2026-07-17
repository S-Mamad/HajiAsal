/**
 * Resolve client IP for rate limiting.
 * Prefer platform-owned headers. Do not trust leftmost X-Forwarded-For
 * unless TRUST_X_FORWARDED_FOR=true (deployed behind a stripping proxy).
 */
export function getTrustedClientIp(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const ip = vercel.split(",")[0]?.trim();
    if (ip) return ip;
  }

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  if (process.env.TRUST_X_FORWARDED_FOR === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim();
    if (ip) return ip;
  }

  // Collapse spoofable/XFF-absent clients into one bucket rather than
  // allowing unlimited login attempts via forged X-Forwarded-For values.
  return "unknown";
}

/** @deprecated Use getTrustedClientIp */
export function getClientIp(request: Request): string {
  return getTrustedClientIp(request);
}

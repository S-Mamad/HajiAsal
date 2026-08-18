/**
 * Resolve client IP for rate limiting.
 * All forwarded headers are spoofable unless the edge proxy overwrites them.
 * Trust them only when TRUST_X_FORWARDED_FOR=true.
 */
export function getTrustedClientIp(request: Request): string {
  if (process.env.TRUST_X_FORWARDED_FOR === "true") {
    const vercel = request.headers.get("x-vercel-forwarded-for");
    if (vercel) {
      const ip = vercel.split(",")[0]?.trim();
      if (ip) return ip;
    }

    const cf = request.headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf;

    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim();
    if (ip) return ip;
  }

  // Collapse spoofable/XFF-absent clients into one bucket rather than
  // allowing unlimited login attempts via forged forwarded headers.
  return "unknown";
}

/** @deprecated Use getTrustedClientIp */
export function getClientIp(request: Request): string {
  return getTrustedClientIp(request);
}

/**
 * Same-origin guard for cookie-authenticated mutations.
 * Browser `fetch` from our apps always sends Origin; CSRF from another
 * site would send a foreign Origin (or none, with sec-fetch-site=cross-site).
 */
export function isTrustedMutationOrigin(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "same-origin" || fetchSite === "none") return true;
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin")?.replace(/\/$/, "");
  if (!origin) {
    // Non-browser clients / older browsers: require Host match via Referer.
    const referer = request.headers.get("referer");
    if (!referer) return false;
    return hostsMatch(request, referer);
  }

  const allowed = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_ADMIN_URL,
    process.env.NEXT_PUBLIC_SELLER_URL,
  ]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => v.replace(/\/$/, ""));

  if (allowed.includes(origin)) return true;
  return hostsMatch(request, origin);
}

function hostsMatch(request: Request, urlLike: string): boolean {
  try {
    const reqHost = new URL(request.url).host;
    const otherHost = new URL(urlLike).host;
    return Boolean(reqHost) && reqHost === otherHost;
  } catch {
    return false;
  }
}

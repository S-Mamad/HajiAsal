/**
 * Read a cookie by exact name. Avoids substring matches like
 * `xhajiasal_customer_session` stealing `hajiasal_customer_session`.
 */
export function readCookieValue(
  cookieHeader: string,
  name: string,
): string | null {
  if (!cookieHeader || !name) return null;
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const raw = trimmed.slice(prefix.length);
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

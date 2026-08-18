/**
 * Plain-text sanitizer for admin-editable storefront copy.
 * Never persist HTML, scripts, or javascript:/data: URLs.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SCRIPT_OR_STYLE = /<(script|style)[\s\S]*?<\/\1>/gi;
const TAGS = /<\/?[a-zA-Z][^>]*>/g;
const DANGEROUS_PROTOCOL = /^(javascript|data|vbscript|file|blob):/i;

function stripMarkup(value: string): string {
  return value.replace(SCRIPT_OR_STYLE, "").replace(TAGS, "");
}

export function sanitizePlainText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return stripMarkup(value)
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeMultiline(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return stripMarkup(value)
    .replace(CONTROL_CHARS, "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

export function sanitizeHttpUrl(value: unknown, max = 400): string {
  const raw = sanitizePlainText(value, max);
  if (!raw) return "";
  if (DANGEROUS_PROTOCOL.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    if (parsed.username || parsed.password) return "";
    return parsed.toString().slice(0, max);
  } catch {
    return "";
  }
}

/** Site-relative path like /shop or /about — never protocol-relative or traversal. */
export function sanitizeSitePath(value: unknown, max = 160): string {
  const raw = sanitizePlainText(value, max);
  if (!raw) return "";
  if (DANGEROUS_PROTOCOL.test(raw)) return "";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "";
  if (raw.includes("..") || raw.includes("\\") || raw.includes("<")) return "";
  return raw.slice(0, max);
}

export function sanitizeCtaHref(value: unknown): string {
  const raw = sanitizePlainText(value, 200);
  if (!raw) return "";
  if (raw.startsWith("/")) return sanitizeSitePath(raw);
  return sanitizeHttpUrl(raw);
}

export function sanitizeEmail(value: unknown): string {
  const raw = sanitizePlainText(value, 120);
  if (!raw) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return "";
  return raw;
}

export function sanitizePhone(value: unknown): string {
  const raw = sanitizePlainText(value, 40)
    .replace(/[۰-۹]/g, (ch) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 1632));
  if (!raw) return "";
  if (!/^[0-9+\-\s()]{6,40}$/.test(raw)) return "";
  return raw;
}

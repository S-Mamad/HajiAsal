const ALLOWED_PREFIXES = [
  "/uploads/tickets/",
  "/uploads/seller-tickets/",
  "/uploads/admin/",
] as const;

/** Site-relative upload paths only — never javascript:/data:/protocol-relative. */
export function sanitizeTicketAttachmentUrl(
  value: unknown,
): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw || raw.length > 500) return null;
  if (raw.includes("\0") || raw.includes("\\") || raw.includes("..")) {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return null;
  const allowed = ALLOWED_PREFIXES.some((p) => raw.startsWith(p));
  if (!allowed) return null;
  if (!/^\/uploads\/[a-z0-9/_./-]+$/i.test(raw)) return null;
  return raw;
}

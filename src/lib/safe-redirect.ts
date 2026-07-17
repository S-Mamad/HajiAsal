import { hajiasalPath } from "@/lib/paths";

/**
 * Allow only same-origin relative paths.
 * Blocks open redirects like //evil.com or https://evil.com.
 */
export function safeInternalRedirect(
  raw: string | null | undefined,
  fallback: string = hajiasalPath("/account"),
): string {
  if (!raw) return fallback;

  let value = raw.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  value = value.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

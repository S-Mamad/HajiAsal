import {
  adminPublicUrl,
  hajiasalPath,
  sellerPublicUrl,
  sitePublicUrl,
} from "@/lib/paths";

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

function allowlistedOrigins(): Set<string> {
  const origins = [sitePublicUrl(), adminPublicUrl(), sellerPublicUrl()];
  const set = new Set<string>();
  for (const base of origins) {
    try {
      set.add(new URL(base).origin);
    } catch {
      /* skip invalid */
    }
  }
  // Local dev defaults — never on a production build.
  if (process.env.NODE_ENV !== "production") {
    set.add("http://localhost:3000");
    set.add("http://127.0.0.1:3000");
  }
  return set;
}

/** Post-auth redirect to /login would soft-loop for already-logged-in users. */
function isLoginPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  return path === "/login" || path.endsWith("/login");
}

/**
 * Relative paths OR absolute URLs whose origin is in the site/admin/seller allowlist.
 * Never returns a /login target (prevents login ↔ redirect soft loops).
 */
export function safeAuthRedirect(
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

  if (!value) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  // Relative path (same rules as safeInternalRedirect)
  if (value.startsWith("/") && !value.startsWith("//")) {
    if (value.includes("://")) return fallback;
    if (isLoginPath(value)) return fallback;
    return value;
  }

  // Absolute http(s) URL — origin must be allowlisted
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fallback;
    }
    if (!allowlistedOrigins().has(url.origin)) {
      return fallback;
    }
    if (isLoginPath(url.pathname)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

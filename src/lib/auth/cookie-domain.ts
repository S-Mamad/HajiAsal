/**
 * Optional shared cookie Domain for cross-subdomain sessions
 * (e.g. `.hajiasal.ir` so storefront + admin + seller share the customer session).
 * Leave unset for local host-only cookies.
 *
 * In production, if AUTH_COOKIE_DOMAIN is missing but site/admin/seller share a
 * parent host (hajiasal.ir + admin.hajiasal.ir), derive `.hajiasal.ir` so panel
 * login redirects actually keep the session across subdomains.
 */
export function getAuthCookieDomain(): string | undefined {
  const raw = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (raw) {
    // Basic sanity: must look like a domain, not a URL path.
    if (raw.includes("/") || raw.includes(" ") || raw.includes(":")) {
      return undefined;
    }
    return raw;
  }
  return deriveSharedCookieDomainFromPublicUrls();
}

function deriveSharedCookieDomainFromPublicUrls(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;

  try {
    const siteHost = new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://hajiasal.ir",
    ).hostname.toLowerCase();
    const adminHost = new URL(
      process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.hajiasal.ir",
    ).hostname.toLowerCase();
    const sellerHost = new URL(
      process.env.NEXT_PUBLIC_SELLER_URL ?? "https://seller.hajiasal.ir",
    ).hostname.toLowerCase();

    if (
      !siteHost ||
      siteHost === "localhost" ||
      siteHost === "127.0.0.1" ||
      !siteHost.includes(".")
    ) {
      return undefined;
    }

    const parentSuffix = `.${siteHost}`;
    const adminOk =
      adminHost === siteHost || adminHost.endsWith(parentSuffix);
    const sellerOk =
      sellerHost === siteHost || sellerHost.endsWith(parentSuffix);
    if (!adminOk || !sellerOk) return undefined;

    // Only useful when at least one panel is on a real subdomain.
    if (adminHost === siteHost && sellerHost === siteHost) return undefined;

    return parentSuffix;
  } catch {
    return undefined;
  }
}

export function authCookieBaseOptions(overrides?: {
  maxAge?: number;
}): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge?: number;
  domain?: string;
} {
  const domain = getAuthCookieDomain();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(overrides?.maxAge !== undefined ? { maxAge: overrides.maxAge } : {}),
    ...(domain ? { domain } : {}),
  };
}

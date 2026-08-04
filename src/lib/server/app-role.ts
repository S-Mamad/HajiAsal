export type AppRole = "storefront" | "admin" | "seller" | "all";

/**
 * Deployment surface for multi-app cPanel installs.
 * - production + unset → storefront (fail-closed; never expose panels)
 * - non-production + unset → all (local single-process)
 */
export function getAppRole(): AppRole {
  const raw = (process.env.APP_ROLE ?? "").trim().toLowerCase();
  if (raw === "storefront" || raw === "admin" || raw === "seller") {
    return raw;
  }
  if (raw === "all") return "all";
  if (process.env.NODE_ENV === "production") {
    return "storefront";
  }
  return "all";
}

export function adminPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "") ||
    "https://admin.hajiasal.ir"
  );
}

export function sellerPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SELLER_URL?.replace(/\/$/, "") ||
    "https://seller.hajiasal.ir"
  );
}

export function sitePublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://hajiasal.ir"
  );
}

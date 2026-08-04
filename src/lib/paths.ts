export const HAJIASAL_BASE = "" as const;

export function hajiasalPath(path = ""): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function hajiasalCanonical(path = ""): string {
  return hajiasalPath(path);
}

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function sitePublicUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://hajiasal.ir").replace(
    /\/$/,
    "",
  );
}

export function adminPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.hajiasal.ir"
  ).replace(/\/$/, "");
}

export function sellerPublicUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SELLER_URL ?? "https://seller.hajiasal.ir"
  ).replace(/\/$/, "");
}

export function hajiasalAbsoluteUrl(path = ""): string {
  const p = hajiasalPath(path);
  return p === "/" ? siteUrl : `${siteUrl}${p}`;
}

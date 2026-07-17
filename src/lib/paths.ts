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

export function hajiasalAbsoluteUrl(path = ""): string {
  const p = hajiasalPath(path);
  return p === "/" ? siteUrl : `${siteUrl}${p}`;
}

/** Pure path decisions for APP_ROLE locks — unit-testable without Next edge. */

export type AppRole = "storefront" | "admin" | "seller" | "all";

export type RolePathAction =
  | { type: "next" }
  | { type: "rewrite"; pathname: string }
  | { type: "not_found" }
  | { type: "redirect"; targetBase: "admin" | "seller"; pathname: string };

function isAdminSurface(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/telegram") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/uploads/")
  );
}

function isSellerSurface(pathname: string): boolean {
  return (
    pathname === "/seller" ||
    pathname.startsWith("/seller/") ||
    pathname.startsWith("/api/seller") ||
    pathname.startsWith("/uploads/")
  );
}

function isStaticSeoNoise(pathname: string): boolean {
  return (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".xml")
  );
}

export function resolveAppRolePath(
  role: AppRole,
  pathname: string,
): RolePathAction {
  if (role === "all") return { type: "next" };

  if (role === "admin") {
    if (pathname === "/" || pathname === "") {
      return { type: "rewrite", pathname: "/admin" };
    }
    if (isStaticSeoNoise(pathname) || !isAdminSurface(pathname)) {
      return { type: "not_found" };
    }
    return { type: "next" };
  }

  if (role === "seller") {
    if (pathname === "/" || pathname === "") {
      return { type: "rewrite", pathname: "/seller" };
    }
    if (isStaticSeoNoise(pathname) || !isSellerSurface(pathname)) {
      return { type: "not_found" };
    }
    return { type: "next" };
  }

  // storefront
  if (pathname.startsWith("/api/admin") || pathname.startsWith("/api/seller")) {
    return { type: "not_found" };
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return { type: "redirect", targetBase: "admin", pathname };
  }
  if (pathname === "/seller" || pathname.startsWith("/seller/")) {
    return { type: "redirect", targetBase: "seller", pathname };
  }
  return { type: "next" };
}

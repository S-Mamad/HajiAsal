import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  CUSTOMER_COOKIE,
  getSessionTokenFromRequest,
  parseSessionTokenEdge,
} from "@/lib/auth/session-edge";
import {
  adminPublicUrl,
  getAppRole,
  sellerPublicUrl,
} from "@/lib/server/app-role";
import { resolveAppRolePath } from "@/lib/server/app-role-path";

const PROTECTED_PREFIXES = ["/account"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAdminPanelPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/") return false;
  return pathname.startsWith("/admin/");
}

function isSellerPanelPath(pathname: string): boolean {
  if (pathname === "/seller" || pathname === "/seller/") return false;
  // Public seller onboarding (no seller session required)
  if (
    pathname === "/seller/apply" ||
    pathname.startsWith("/seller/apply/")
  ) {
    return false;
  }
  return pathname.startsWith("/seller/");
}

function isNextInternal(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:ico|png|jpg|jpeg|gif|webp|svg|webmanifest)$/i.test(pathname)
  );
}

function notFound(): NextResponse {
  return new NextResponse("Not Found", { status: 404 });
}

function panelLoginRedirect(
  request: NextRequest,
  returnPath: string,
): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", returnPath);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getAppRole();

  if (isNextInternal(pathname)) {
    return NextResponse.next();
  }

  const roleAction = resolveAppRolePath(role, pathname);
  if (roleAction.type === "rewrite") {
    const url = request.nextUrl.clone();
    url.pathname = roleAction.pathname;
    return NextResponse.rewrite(url);
  }
  if (roleAction.type === "not_found") {
    return notFound();
  }
  if (roleAction.type === "redirect") {
    const base =
      roleAction.targetBase === "admin" ? adminPublicUrl() : sellerPublicUrl();
    return NextResponse.redirect(
      new URL(roleAction.pathname, `${base}/`),
      301,
    );
  }

  // Handoff copies the storefront session onto the panel host cookie.
  if (
    pathname === "/api/admin/auth/handoff" ||
    pathname === "/api/seller/auth/handoff"
  ) {
    return NextResponse.next();
  }

  // --- Panel paths: require customer session cookie (eligibility in layout) ---
  if (isSellerPanelPath(pathname) || isAdminPanelPath(pathname)) {
    const token = getSessionTokenFromRequest(request);
    const session = token ? await parseSessionTokenEdge(token) : null;
    if (!session) {
      return panelLoginRedirect(request, pathname);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/seller") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (isProtected(pathname)) {
    const token = getSessionTokenFromRequest(request);
    const session = token ? await parseSessionTokenEdge(token) : null;
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Incomplete profile must finish registration before account pages.
    if (!session.fullName?.trim()) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("step", "complete");
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/admin",
    "/admin/:path*",
    "/seller",
    "/seller/:path*",
    "/api/admin/:path*",
    "/api/seller/:path*",
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};

// Re-export for tests that may reference cookie name
export { CUSTOMER_COOKIE };

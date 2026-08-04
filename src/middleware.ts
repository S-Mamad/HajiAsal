import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
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
const ADMIN_COOKIE = "hajiasal_admin_session";
const SELLER_COOKIE = "hajiasal_seller_session";

/** Edge-safe shape check — full validation happens in layout/API. */
function looksLikeSessionToken(token: string | undefined): boolean {
  if (!token || token.length < 16 || token.length > 512) return false;
  return /^[A-Za-z0-9_-]+$/.test(token);
}

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

  // --- Session gates ---
  if (isSellerPanelPath(pathname)) {
    const token = request.cookies.get(SELLER_COOKIE)?.value;
    if (!looksLikeSessionToken(token)) {
      return NextResponse.redirect(new URL("/seller", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/seller")) {
    return NextResponse.next();
  }

  if (isAdminPanelPath(pathname)) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (!looksLikeSessionToken(token)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
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

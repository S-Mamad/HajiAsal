import type { NextResponse } from "next/server";
import { authCookieBaseOptions, getAuthCookieDomain } from "@/lib/auth/cookie-domain";
import { readCookieValue } from "@/lib/auth/cookie-value";

/** Keep in sync with admin.ts / sellers.ts — avoid heavy static imports here. */
const ADMIN_COOKIE = "hajiasal_admin_session";
const SELLER_COOKIE = "hajiasal_seller_session";

function readCookie(request: Request, name: string): string | null {
  return readCookieValue(request.headers.get("cookie") ?? "", name);
}

function clearCookieVariants(response: NextResponse, name: string) {
  // Always clear host-only (legacy panel cookies had no Domain).
  response.cookies.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  // Also clear Domain-scoped variant when AUTH_COOKIE_DOMAIN is set.
  const domain = getAuthCookieDomain();
  if (domain) {
    response.cookies.set(name, "", {
      ...authCookieBaseOptions({ maxAge: 0 }),
    });
  }
}

/**
 * Revoke server-side admin/seller sessions present on the request and
 * clear legacy panel cookies. Does NOT clear CUSTOMER_COOKIE — callers
 * that set a fresh customer session must not clear it on the same response.
 */
export async function clearAllAuthSessions(
  request: Request,
  response: NextResponse,
): Promise<void> {
  const adminToken = readCookie(request, ADMIN_COOKIE);
  const sellerToken = readCookie(request, SELLER_COOKIE);

  if (adminToken) {
    try {
      const { revokeAdminSession } = await import("@/lib/server/admin-sessions");
      await revokeAdminSession(adminToken);
    } catch {
      /* ignore revoke failures */
    }
  }
  if (sellerToken) {
    try {
      const { revokeSellerSession } = await import("@/lib/server/sellers");
      await revokeSellerSession(sellerToken);
    } catch {
      /* ignore revoke failures */
    }
  }

  clearCookieVariants(response, ADMIN_COOKIE);
  clearCookieVariants(response, SELLER_COOKIE);
}

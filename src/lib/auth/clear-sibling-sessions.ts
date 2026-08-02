import type { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/auth/session";

/** Keep in sync with admin.ts / sellers.ts — avoid heavy static imports here. */
const ADMIN_COOKIE = "hajiasal_admin_session";
const SELLER_COOKIE = "hajiasal_seller_session";

const CLEAR_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", CLEAR_OPTS);
}

/**
 * Revoke server-side admin/seller sessions present on the request and
 * clear all role cookies so only one account can be active per browser.
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

  clearCookie(response, CUSTOMER_COOKIE);
  clearCookie(response, ADMIN_COOKIE);
  clearCookie(response, SELLER_COOKIE);
}

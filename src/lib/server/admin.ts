import { timingSafeEqual } from "crypto";
import {
  createAdminSession,
  revokeAdminSession,
  validateAdminSessionToken,
} from "./admin-sessions";
import {
  getAdminAuthFromCustomerSession,
  getAdminAuthFromToken,
  type AdminAuthContext,
} from "./admin-auth";
import { getSessionFromCookies, getSessionFromRequest } from "@/lib/auth/session";
import { readCookieValue } from "@/lib/auth/cookie-value";

export const ADMIN_COOKIE = "hajiasal_admin_session";

export function verifyAdminPassword(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(password);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function getTokenFromCookieHeader(cookieHeader: string): string | null {
  return readCookieValue(cookieHeader, ADMIN_COOKIE);
}

export async function getAdminTokenFromCookies(): Promise<string | null> {
  // Legacy helper — panels now use customer session.
  return null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getSessionFromCookies();
  const ctx = await getAdminAuthFromCustomerSession(session);
  return ctx.authenticated;
}

export async function getAdminAuthContext(): Promise<AdminAuthContext> {
  const session = await getSessionFromCookies();
  return getAdminAuthFromCustomerSession(session);
}

export async function isAdminRequestAuthenticatedAsync(
  request: Request,
): Promise<boolean> {
  const session = getSessionFromRequest(request);
  const ctx = await getAdminAuthFromCustomerSession(session);
  return ctx.authenticated;
}

export async function loginAdmin(meta?: {
  ipAddress?: string;
  userAgent?: string;
  adminUserId?: string | null;
}): Promise<string | null> {
  const result = await createAdminSession(meta);
  return result?.token ?? null;
}

export async function logoutAdmin(request?: Request): Promise<void> {
  let token: string | null = null;
  if (request) {
    token = getTokenFromCookieHeader(request.headers.get("cookie") ?? "");
  }
  if (token) await revokeAdminSession(token);
}

export function adminCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

/** @deprecated Prefer getAdminAuthFromCustomerSession — kept for migration tests */
export { getAdminAuthFromToken, validateAdminSessionToken };

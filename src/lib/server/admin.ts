import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  createAdminSession,
  revokeAdminSession,
  validateAdminSessionToken,
} from "./admin-sessions";
import {
  getAdminAuthFromToken,
  type AdminAuthContext,
} from "./admin-auth";

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
  const match = cookieHeader.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function getAdminTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value ?? null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminTokenFromCookies();
  if (!token) return false;
  const ctx = await getAdminAuthFromToken(token);
  return ctx.authenticated;
}

export async function getAdminAuthContext(): Promise<AdminAuthContext> {
  const token = await getAdminTokenFromCookies();
  return getAdminAuthFromToken(token);
}

export async function isAdminRequestAuthenticatedAsync(
  request: Request,
): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = getTokenFromCookieHeader(cookieHeader);
  if (!token) return false;
  return validateAdminSessionToken(token);
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
  } else {
    token = await getAdminTokenFromCookies();
  }
  if (token) await revokeAdminSession(token);
}

export function adminCookieOptions(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

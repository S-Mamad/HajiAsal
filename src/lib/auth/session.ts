import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { SessionPayload } from "@/types/auth";
import { authCookieBaseOptions } from "@/lib/auth/cookie-domain";
import { readCookieValue } from "@/lib/auth/cookie-value";

export const CUSTOMER_COOKIE = "hajiasal_customer_session";
const SESSION_DAYS = 30;

function getSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error(
        "AUTH_SESSION_SECRET must be at least 32 characters in production",
      );
    }
  }
  return secret ?? "dev-only-insecure-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: {
  userId: string;
  phone: string;
  fullName: string | null;
}): string {
  const payload: SessionPayload = {
    userId: user.userId,
    phone: user.phone,
    fullName: user.fullName,
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expected = sign(encoded);

  try {
    if (
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.userId || !payload.phone || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token);
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const token = readCookieValue(
    request.headers.get("cookie") ?? "",
    CUSTOMER_COOKIE,
  );
  if (!token) return null;
  return parseSessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, token, {
    ...authCookieBaseOptions({ maxAge: SESSION_DAYS * 24 * 60 * 60 }),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, "", {
    ...authCookieBaseOptions({ maxAge: 0 }),
  });
}

export function sessionCookieOptions(token: string) {
  return {
    name: CUSTOMER_COOKIE,
    value: token,
    ...authCookieBaseOptions({ maxAge: SESSION_DAYS * 24 * 60 * 60 }),
  };
}

/** Options to expire the customer cookie (logout / migration). */
export function clearCustomerCookieOptions() {
  return {
    name: CUSTOMER_COOKIE,
    value: "",
    ...authCookieBaseOptions({ maxAge: 0 }),
  };
}

type CookieWritable = {
  cookies: {
    set: (
      name: string,
      value: string,
      options: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "lax" | "strict" | "none";
        path?: string;
        maxAge?: number;
        domain?: string;
      },
    ) => void;
  };
};

/** Set customer session cookie including AUTH_COOKIE_DOMAIN when configured. */
export function applySessionCookieToResponse(
  response: CookieWritable,
  token: string,
): void {
  const cookie = sessionCookieOptions(token);
  const { name, value, ...options } = cookie;
  response.cookies.set(name, value, options);
}

/** Clear customer session cookie (same Domain as when it was set). */
export function clearSessionCookieOnResponse(response: CookieWritable): void {
  const clear = clearCustomerCookieOptions();
  const { name, value, ...options } = clear;
  response.cookies.set(name, value, options);
}

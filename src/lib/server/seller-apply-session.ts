import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const SELLER_APPLY_COOKIE = "hajiasal_seller_apply";
const APPLY_SESSION_HOURS = 2;

type ApplyPayload = {
  phone: string;
  exp: number;
};

function secret(): string {
  const value =
    process.env.SELLER_APPLY_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  if (process.env.NODE_ENV === "production") {
    if (!value || value.length < 32) {
      throw new Error(
        "SELLER_APPLY_SECRET or AUTH_SESSION_SECRET must be at least 32 characters in production",
      );
    }
    return value;
  }
  return value || "dev-seller-apply-secret";
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(payloadB64: string): string {
  return b64url(
    createHmac("sha256", secret()).update(payloadB64).digest(),
  );
}

export function createSellerApplyToken(phone: string): string {
  const payload: ApplyPayload = {
    phone,
    exp: Date.now() + APPLY_SESSION_HOURS * 60 * 60 * 1000,
  };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function parseSellerApplyToken(token: string | undefined): ApplyPayload | null {
  if (!token || token.length < 20 || token.length > 512) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      fromB64url(payloadB64).toString("utf8"),
    ) as ApplyPayload;
    if (!payload?.phone || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSellerApplySessionFromRequest(
  request: Request,
): ApplyPayload | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SELLER_APPLY_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(SELLER_APPLY_COOKIE.length + 1));
  return parseSellerApplyToken(value);
}

export function sellerApplyCookieOptions(token: string) {
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "1";
  return {
    name: SELLER_APPLY_COOKIE,
    value: token,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: APPLY_SESSION_HOURS * 60 * 60,
  };
}

export function clearSellerApplyCookie(response: NextResponse): void {
  response.cookies.set(SELLER_APPLY_COOKIE, "", {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.COOKIE_SECURE === "1",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Folder segment for uploads keyed by phone hash (no PII in path). */
export function applyUploadFolder(phone: string): string {
  return createHmac("sha256", secret())
    .update(`apply:${phone}`)
    .digest("hex")
    .slice(0, 24);
}

export function newApplyNonce(): string {
  return randomBytes(8).toString("hex");
}

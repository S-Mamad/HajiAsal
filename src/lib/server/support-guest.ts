/**
 * Lightweight guest identity for support FAB (name + phone, no OTP login).
 * Tickets are bound to a random guestId, not the phone, so knowing a number
 * cannot mint access to another visitor's threads.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { authCookieBaseOptions } from "@/lib/auth/cookie-domain";
import { isValidIranPhone, normalizePhone } from "@/lib/auth/phone";
import { readCookieValue } from "@/lib/auth/cookie-value";

export const SUPPORT_GUEST_COOKIE = "hajiasal_support_guest";
const GUEST_DAYS = 30;

export type SupportGuestPayload = {
  /** Unguessable id: guest-{32 hex} */
  guestId: string;
  phone: string;
  fullName: string;
  exp: number;
};

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

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Keep timing roughly constant; still reject.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function guestCustomerId(phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("INVALID_PHONE");
  return `guest-${normalized}`;
}

export function newGuestCustomerId(): string {
  return `guest-${randomBytes(16).toString("hex")}`;
}

export function createSupportGuestToken(input: {
  fullName: string;
  phone: string;
}): string {
  const phone = normalizePhone(input.phone);
  if (!phone || !isValidIranPhone(phone)) {
    throw new Error("INVALID_PHONE");
  }
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 80) {
    throw new Error("INVALID_NAME");
  }
  const payload: SupportGuestPayload = {
    guestId: newGuestCustomerId(),
    phone,
    fullName,
    exp: Date.now() + GUEST_DAYS * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parseSupportGuestToken(
  token: string,
): SupportGuestPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = sign(encoded);
  if (!signaturesMatch(signature, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SupportGuestPayload;
    if (
      !payload.guestId ||
      !payload.phone ||
      !payload.fullName ||
      !payload.exp
    ) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    if (!isValidIranPhone(payload.phone)) return null;
    if (!payload.guestId.startsWith("guest-")) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSupportGuestFromRequest(
  request: Request,
): SupportGuestPayload | null {
  const raw = readCookieValue(
    request.headers.get("cookie") ?? "",
    SUPPORT_GUEST_COOKIE,
  );
  if (!raw) return null;
  return parseSupportGuestToken(raw);
}

export function supportGuestCookieOptions(token: string) {
  return {
    name: SUPPORT_GUEST_COOKIE,
    value: token,
    ...authCookieBaseOptions({ maxAge: GUEST_DAYS * 24 * 60 * 60 }),
  };
}

export type SupportActor = {
  customerId: string;
  phone: string;
  fullName: string | null;
  kind: "user" | "guest";
};

/** Prefer logged-in session; otherwise signed guest cookie. */
export function resolveSupportActor(
  session: {
    userId: string;
    phone: string;
    fullName: string | null;
  } | null,
  request: Request,
): SupportActor | null {
  if (session) {
    return {
      customerId: session.userId,
      phone: session.phone,
      fullName: session.fullName,
      kind: "user",
    };
  }
  const guest = getSupportGuestFromRequest(request);
  if (!guest) return null;
  return {
    customerId: guest.guestId,
    phone: guest.phone,
    fullName: guest.fullName,
    kind: "guest",
  };
}

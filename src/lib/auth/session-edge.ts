import type { SessionPayload } from "@/types/auth";

export const CUSTOMER_COOKIE = "hajiasal_customer_session";

function getSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SESSION_SECRET is required in production");
  }
  return secret ?? "dev-only-insecure-secret-change-me";
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(signature);
}

export async function parseSessionTokenEdge(
  token: string,
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expected = await sign(encoded);

  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as SessionPayload;
    if (!payload.userId || !payload.phone || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${CUSTOMER_COOKIE}=([^;]+)`));
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

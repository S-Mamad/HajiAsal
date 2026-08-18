import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  applySessionCookieToResponse,
  createSessionToken,
} from "@/lib/auth/session";
import {
  adminPublicUrl,
  sellerPublicUrl,
} from "@/lib/paths";
import {
  isDuplicateKeyError,
  isMysqlUsable,
  mysqlExecute,
} from "@/lib/server/mysql";

export type PanelAudience = "admin" | "seller";

export type PanelHandoffPayload = {
  userId: string;
  phone: string;
  fullName: string | null;
  exp: number;
  aud: PanelAudience;
  next: string;
  jti: string;
};

const HANDOFF_TTL_MS = 90_000;

const consumedJtis = new Map<string, number>();
let handoffTableReady: Promise<void> | null = null;

function pruneConsumed(now = Date.now()): void {
  for (const [jti, exp] of consumedJtis) {
    if (exp < now) consumedJtis.delete(jti);
  }
}

async function ensureHandoffTable(): Promise<void> {
  if (!isMysqlUsable()) return;
  if (!handoffTableReady) {
    handoffTableReady = mysqlExecute(`
      CREATE TABLE IF NOT EXISTS panel_handoff_tickets (
        jti VARCHAR(64) NOT NULL PRIMARY KEY,
        exp_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => undefined);
  }
  await handoffTableReady;
}

/** Returns false if the ticket was already used. */
async function consumeJtiOnce(jti: string, exp: number): Promise<boolean> {
  pruneConsumed();
  if (consumedJtis.has(jti)) return false;

  if (isMysqlUsable()) {
    try {
      await ensureHandoffTable();
      await mysqlExecute(
        `INSERT INTO panel_handoff_tickets (jti, exp_at) VALUES (?, ?)`,
        [jti, new Date(exp).toISOString()],
      );
      consumedJtis.set(jti, exp);
      return true;
    } catch (error) {
      if (isDuplicateKeyError(error)) return false;
      /* fall through to process-local consume */
    }
  }

  consumedJtis.set(jti, exp);
  return true;
}

export function __resetPanelHandoffForTests(): void {
  consumedJtis.clear();
  handoffTableReady = null;
}

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

export function safeHandoffNext(
  raw: string,
  aud: PanelAudience,
): string {
  const fallback = aud === "admin" ? "/admin/dashboard" : "/seller/dashboard";
  let path = raw.trim();
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    return fallback;
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  if (aud === "admin" && (path === "/admin" || path.startsWith("/admin/"))) {
    return path;
  }
  if (aud === "seller" && (path === "/seller" || path.startsWith("/seller/"))) {
    return path;
  }
  return fallback;
}

export function resolvePanelHandoffTarget(
  raw: string | null | undefined,
): { aud: PanelAudience; origin: string; next: string } | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const adminOrigin = new URL(adminPublicUrl()).origin;
    const sellerOrigin = new URL(sellerPublicUrl()).origin;
    if (url.origin === adminOrigin) {
      return {
        aud: "admin",
        origin: adminOrigin,
        next: safeHandoffNext(url.pathname, "admin"),
      };
    }
    if (url.origin === sellerOrigin) {
      return {
        aud: "seller",
        origin: sellerOrigin,
        next: safeHandoffNext(url.pathname, "seller"),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function createPanelHandoffTicket(input: {
  userId: string;
  phone: string;
  fullName: string | null;
  aud: PanelAudience;
  next: string;
  now?: number;
}): string {
  const payload: PanelHandoffPayload = {
    userId: input.userId,
    phone: input.phone,
    fullName: input.fullName,
    aud: input.aud,
    next: safeHandoffNext(input.next, input.aud),
    exp: (input.now ?? Date.now()) + HANDOFF_TTL_MS,
    jti: randomBytes(16).toString("hex"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function parsePanelHandoffTicket(
  ticket: string,
  now = Date.now(),
): PanelHandoffPayload | null {
  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;
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
    ) as PanelHandoffPayload;
    if (!payload.userId || !payload.phone || !payload.exp) return null;
    if (!payload.jti || payload.jti.length < 16) return null;
    if (payload.aud !== "admin" && payload.aud !== "seller") return null;
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function panelHandoffConsumeUrl(
  origin: string,
  aud: PanelAudience,
  ticket: string,
): string {
  const path =
    aud === "admin" ? "/api/admin/auth/handoff" : "/api/seller/auth/handoff";
  const url = new URL(path, `${origin}/`);
  url.searchParams.set("ticket", ticket);
  return url.toString();
}

function failedHandoffLoginUrl(
  requestUrl: string,
  aud: PanelAudience,
  next: string,
): string {
  const login = new URL("/login", requestUrl);
  login.searchParams.set("stay", "1");
  login.searchParams.set("redirect", safeHandoffNext(next, aud));
  return login.toString();
}

export async function consumePanelHandoffRequest(
  request: Request,
  expectedAud: PanelAudience,
): Promise<NextResponse> {
  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket") ?? "";
  const payload = parsePanelHandoffTicket(ticket);
  if (!payload || payload.aud !== expectedAud) {
    return NextResponse.redirect(
      failedHandoffLoginUrl(
        request.url,
        expectedAud,
        `/${expectedAud}/dashboard`,
      ),
    );
  }

  const firstUse = await consumeJtiOnce(payload.jti, payload.exp);
  if (!firstUse) {
    return NextResponse.redirect(
      failedHandoffLoginUrl(
        request.url,
        expectedAud,
        `/${expectedAud}/dashboard`,
      ),
    );
  }

  const token = createSessionToken({
    userId: payload.userId,
    phone: payload.phone,
    fullName: payload.fullName,
  });
  const next = safeHandoffNext(payload.next, expectedAud);
  const response = NextResponse.redirect(new URL(next, url.origin));
  applySessionCookieToResponse(response, token);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

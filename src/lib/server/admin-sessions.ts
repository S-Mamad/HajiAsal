import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetAdminSessions,
  memorySetAdminSessions,
} from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import { isMysqlConfigured, mysqlExecute, mysqlQueryOne, toIso } from "./mysql";

const SESSIONS_FILE = "admin-sessions.json";
const SESSION_DAYS = 7;

export interface AdminSession {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAdminToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createAdminSession(meta?: {
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ sessionId: string; token: string } | null> {
  const sessionId = randomUUID();
  const token = generateAdminToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const session: AdminSession = {
    id: sessionId,
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO admin_sessions (id, token_hash, created_at, expires_at, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          tokenHash,
          session.createdAt,
          expiresAt.toISOString(),
          meta?.ipAddress ?? null,
          meta?.userAgent ?? null,
        ],
      );
      return { sessionId, token };
    } catch (error) {
      console.error(
        "[admin-sessions] insert failed:",
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  if (canUseFilesystemPersistence()) {
    const sessions = await readJsonFile<AdminSession[]>(SESSIONS_FILE, []);
    sessions.push(session);
    await writeJsonFile(SESSIONS_FILE, sessions);
    return { sessionId, token };
  }

  // Demo / single-instance production without Supabase
  const mem = memoryGetAdminSessions();
  mem.push(session);
  memorySetAdminSessions(mem);
  return { sessionId, token };
}

export async function validateAdminSessionToken(
  token: string,
): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1",
        [tokenHash],
      );
      if (!row) return false;
      if (new Date(toIso(row.expires_at)).getTime() < Date.now()) return false;
      return true;
    } catch (error) {
      console.error(
        "[admin-sessions] validate failed:",
        error instanceof Error ? error.message : error,
      );
      return false;
    }
  }

  if (canUseFilesystemPersistence()) {
    const sessions = await readJsonFile<AdminSession[]>(SESSIONS_FILE, []);
    const session = sessions.find(
      (s) => s.tokenHash === tokenHash && !s.revokedAt,
    );
    if (!session) return false;
    if (new Date(session.expiresAt).getTime() < Date.now()) return false;
    return true;
  }

  const session = memoryGetAdminSessions().find(
    (s) => s.tokenHash === tokenHash && !s.revokedAt,
  );
  if (!session) return false;
  if (new Date(session.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export async function revokeAdminSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?",
        [new Date().toISOString(), tokenHash],
      );
    } catch (error) {
      console.error(
        "[admin-sessions] revoke failed:",
        error instanceof Error ? error.message : error,
      );
    }
    return;
  }

  if (canUseFilesystemPersistence()) {
    const sessions = await readJsonFile<AdminSession[]>(SESSIONS_FILE, []);
    const updated = sessions.map((s) =>
      s.tokenHash === tokenHash
        ? { ...s, revokedAt: new Date().toISOString() }
        : s,
    );
    await writeJsonFile(SESSIONS_FILE, updated);
    return;
  }

  memorySetAdminSessions(
    memoryGetAdminSessions().map((s) =>
      s.tokenHash === tokenHash
        ? { ...s, revokedAt: new Date().toISOString() }
        : s,
    ),
  );
}

export function safeCompareTokens(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

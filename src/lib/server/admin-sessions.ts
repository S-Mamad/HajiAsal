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
  adminUserId?: string | null;
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
  adminUserId?: string | null;
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
    adminUserId: meta?.adminUserId ?? null,
  };

  let mysqlOk = false;
  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO admin_sessions (id, token_hash, created_at, expires_at, ip_address, user_agent, admin_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          tokenHash,
          session.createdAt,
          expiresAt.toISOString(),
          meta?.ipAddress ?? null,
          meta?.userAgent ?? null,
          meta?.adminUserId ?? null,
        ],
      );
      mysqlOk = true;
    } catch (error) {
      // Only omit admin_user_id when the column truly does not exist yet.
      // Any other failure must not create an unbound session (legacy → super_admin).
      const message =
        error instanceof Error ? error.message : String(error);
      const unknownColumn =
        /unknown column ['`]?admin_user_id['`]?/i.test(message) ||
        (typeof error === "object" &&
          error !== null &&
          "errno" in error &&
          Number((error as { errno: number }).errno) === 1054);
      if (unknownColumn && !meta?.adminUserId) {
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
          mysqlOk = true;
        } catch (inner) {
          console.error(
            "[admin-sessions] mysql insert failed, falling back:",
            inner instanceof Error ? inner.message : inner,
          );
        }
      } else {
        console.error(
          "[admin-sessions] mysql insert failed, falling back:",
          message,
        );
        // Fall through to filesystem / memory when MySQL is unreachable —
        // FS/memory session still keeps adminUserId from the in-memory object.
      }
    }
  }

  // Dual-write: always mirror to FS/memory so sessions survive MySQL outages.
  if (canUseFilesystemPersistence()) {
    try {
      const sessions = await readJsonFile<AdminSession[]>(SESSIONS_FILE, []);
      sessions.push(session);
      await writeJsonFile(SESSIONS_FILE, sessions);
    } catch (error) {
      console.error(
        "[admin-sessions] fs dual-write failed:",
        error instanceof Error ? error.message : error,
      );
      if (!mysqlOk) {
        const mem = memoryGetAdminSessions();
        mem.push(session);
        memorySetAdminSessions(mem);
      }
    }
  } else {
    const mem = memoryGetAdminSessions();
    mem.push(session);
    memorySetAdminSessions(mem);
  }

  return { sessionId, token };
}

export async function validateAdminSessionTokenDetailed(
  token: string,
): Promise<{ valid: boolean; adminUserId: string | null }> {
  if (!token) return { valid: false, adminUserId: null };
  const tokenHash = hashToken(token);

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1",
        [tokenHash],
      );
      if (row) {
        if (new Date(toIso(row.expires_at)).getTime() < Date.now()) {
          return { valid: false, adminUserId: null };
        }
        return {
          valid: true,
          adminUserId: row.admin_user_id ? String(row.admin_user_id) : null,
        };
      }
      // Not in MySQL — may be a local FS/memory session while MySQL is up or recovering
    } catch (error) {
      console.error(
        "[admin-sessions] validate mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (canUseFilesystemPersistence()) {
    const sessions = await readJsonFile<AdminSession[]>(SESSIONS_FILE, []);
    const session = sessions.find(
      (s) => s.tokenHash === tokenHash && !s.revokedAt,
    );
    if (!session) {
      // continue to memory
    } else if (new Date(session.expiresAt).getTime() < Date.now()) {
      return { valid: false, adminUserId: null };
    } else {
      return { valid: true, adminUserId: session.adminUserId ?? null };
    }
  }

  const session = memoryGetAdminSessions().find(
    (s) => s.tokenHash === tokenHash && !s.revokedAt,
  );
  if (!session) return { valid: false, adminUserId: null };
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return { valid: false, adminUserId: null };
  }
  return { valid: true, adminUserId: session.adminUserId ?? null };
}

export async function validateAdminSessionToken(
  token: string,
): Promise<boolean> {
  const result = await validateAdminSessionTokenDetailed(token);
  return result.valid;
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
        "[admin-sessions] revoke mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (canUseFilesystemPersistence()) {
    const sessions = await readJsonFile<AdminSession[]>(SESSIONS_FILE, []);
    const updated = sessions.map((s) =>
      s.tokenHash === tokenHash
        ? { ...s, revokedAt: new Date().toISOString() }
        : s,
    );
    await writeJsonFile(SESSIONS_FILE, updated);
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

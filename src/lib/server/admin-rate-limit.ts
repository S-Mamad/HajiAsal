import type { RowDataPacket } from "mysql2/promise";
import { appendToJsonArray } from "./db";
import { canUseFilesystemPersistence } from "./production";
import { isMysqlConfigured, mysqlExecute, mysqlQueryOne, newId } from "./mysql";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const ATTEMPTS_FILE = "admin-login-attempts.json";

interface LoginAttempt {
  ipAddress: string;
  attemptedAt: string;
  success: boolean;
}

const memoryAttempts = new Map<string, number[]>();

export async function checkAdminLoginRateLimit(
  ipAddress: string,
): Promise<{ allowed: boolean; message?: string }> {
  const now = Date.now();

  if (isMysqlConfigured()) {
    try {
      const since = new Date(now - WINDOW_MS).toISOString();
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT COUNT(*) AS count FROM admin_login_attempts
         WHERE ip_address = ? AND success = 0 AND attempted_at >= ?`,
        [ipAddress, since],
      );
      const count = Number(row?.count ?? 0);
      if (count >= MAX_ATTEMPTS) {
        return {
          allowed: false,
          message: "تعداد تلاش بیش از حد. ۱۵ دقیقه صبر کنید",
        };
      }
      return { allowed: true };
    } catch (error) {
      console.error(
        "[admin-rate-limit] check failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const times = (memoryAttempts.get(ipAddress) ?? []).filter(
    (t) => now - t < WINDOW_MS,
  );
  if (times.length >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      message: "تعداد تلاش بیش از حد. ۱۵ دقیقه صبر کنید",
    };
  }
  return { allowed: true };
}

export async function recordAdminLoginAttempt(
  ipAddress: string,
  success: boolean,
): Promise<void> {
  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "INSERT INTO admin_login_attempts (id, ip_address, success) VALUES (?, ?, ?)",
        [newId(), ipAddress, success],
      );
    } catch (error) {
      console.error(
        "[admin-rate-limit] record failed:",
        error instanceof Error ? error.message : error,
      );
    }
    return;
  }

  if (!success) {
    const now = Date.now();
    const times = (memoryAttempts.get(ipAddress) ?? []).filter(
      (t) => now - t < WINDOW_MS,
    );
    memoryAttempts.set(ipAddress, [...times, now]);
  }

  // Never let audit logging break login (append throws without filesystem in prod).
  if (!canUseFilesystemPersistence()) return;
  try {
    await appendToJsonArray(ATTEMPTS_FILE, {
      ipAddress,
      attemptedAt: new Date().toISOString(),
      success,
    } as LoginAttempt);
  } catch {
    /* ignore audit write failures */
  }
}

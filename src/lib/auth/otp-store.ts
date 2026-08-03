import { createHash, randomInt, timingSafeEqual } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQueryOne,
  newId,
  toIso,
} from "@/lib/server/mysql";

/** Default OTP length for self-generated codes (test + Kavenegar/Ghasedak). */
export const OTP_LENGTH = 4;

/**
 * Accepted OTP length range. Melipayamak console OTP can be configured to any
 * length in this range; we store whatever the gateway returns and let the UI
 * render the matching number of inputs.
 */
export const MIN_OTP_LENGTH = 4;
export const MAX_OTP_LENGTH = 10;

const OTP_TTL_MS = 5 * 60 * 1000;
/** Production stays strict; local/E2E need headroom for repeated test-phone logins. */
const MAX_SENDS_PER_WINDOW =
  process.env.NODE_ENV === "production"
    ? 3
    : Number(process.env.AUTH_OTP_MAX_SENDS || 30);
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

interface MemoryChallenge {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

type GlobalOtpMemory = {
  challenges: Map<string, MemoryChallenge>;
  sendLog: Map<string, number[]>;
};

function getMemory(): GlobalOtpMemory {
  const g = globalThis as typeof globalThis & {
    __hajiasalOtpMemory?: GlobalOtpMemory;
  };
  if (!g.__hajiasalOtpMemory) {
    g.__hajiasalOtpMemory = {
      challenges: new Map(),
      sendLog: new Map(),
    };
  }
  return g.__hajiasalOtpMemory;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function generateCode(): string {
  // 4 digits: 1000–9999 (9000 possibilities). Leading zeros not used.
  return String(randomInt(1000, 10000));
}

function storeMemoryChallenge(phone: string, codeHash: string): void {
  getMemory().challenges.set(phone, {
    codeHash,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
}

function verifyMemoryChallenge(
  phone: string,
  codeHash: string,
): { valid: boolean; message: string } {
  const challenge = getMemory().challenges.get(phone);
  if (!challenge) {
    return { valid: false, message: "کد منقضی شده. دوباره درخواست دهید" };
  }

  if (challenge.expiresAt < Date.now()) {
    getMemory().challenges.delete(phone);
    return { valid: false, message: "کد منقضی شده. دوباره درخواست دهید" };
  }

  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
    return { valid: false, message: "تعداد تلاش بیش از حد. کد جدید بگیرید" };
  }

  if (!safeEqualHex(challenge.codeHash, codeHash)) {
    challenge.attempts += 1;
    return { valid: false, message: "کد تأیید نادرست است" };
  }

  getMemory().challenges.delete(phone);
  return { valid: true, message: "تأیید شد" };
}

export function isValidOtpCode(code: string): boolean {
  return new RegExp(`^\\d{${MIN_OTP_LENGTH},${MAX_OTP_LENGTH}}$`).test(code);
}

/** Check whether another send is allowed (does NOT record a hit). */
export function peekSendRateLimit(
  phone: string,
): { allowed: boolean; message?: string; retryAfterSec?: number } {
  const now = Date.now();
  const sendLog = getMemory().sendLog;
  const times = (sendLog.get(phone) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  if (times.length >= MAX_SENDS_PER_WINDOW) {
    const oldest = times[0] ?? now;
    return {
      allowed: false,
      message: "لطفاً چند دقیقه صبر کنید و دوباره تلاش کنید",
      retryAfterSec: Math.max(1, Math.ceil((oldest + SEND_WINDOW_MS - now) / 1000)),
    };
  }
  return { allowed: true };
}

/** Record a successful OTP send for per-phone rate limiting. */
export function recordSuccessfulSend(phone: string): void {
  const now = Date.now();
  const sendLog = getMemory().sendLog;
  const times = (sendLog.get(phone) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  sendLog.set(phone, [...times, now]);
}

/** @deprecated Prefer peekSendRateLimit + recordSuccessfulSend */
export function checkSendRateLimit(
  phone: string,
): { allowed: boolean; message?: string } {
  const peek = peekSendRateLimit(phone);
  if (!peek.allowed) return peek;
  recordSuccessfulSend(phone);
  return { allowed: true };
}

async function clearPreviousChallenges(phone: string): Promise<void> {
  if (isMysqlConfigured()) {
    try {
      await mysqlExecute("DELETE FROM otp_challenges WHERE phone = ?", [phone]);
    } catch (error) {
      console.error(
        "[otp] clear mysql challenges failed, continuing:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  getMemory().challenges.delete(phone);
}

export async function createOtpChallenge(
  phone: string,
  fixedCode?: string,
): Promise<string> {
  if (process.env.NODE_ENV === "production" && !isMysqlConfigured()) {
    throw new Error("MySQL is required for OTP in production");
  }

  const code = fixedCode ?? generateCode();
  if (!isValidOtpCode(code)) {
    throw new Error(
      `OTP must be ${MIN_OTP_LENGTH}-${MAX_OTP_LENGTH} digits`,
    );
  }

  await clearPreviousChallenges(phone);

  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO otp_challenges (id, phone, code_hash, expires_at, attempts)
         VALUES (?, ?, ?, ?, 0)`,
        [newId(), phone, codeHash, expiresAt],
      );
      // Keep a memory mirror so verify still works if MySQL drops mid-flight.
      storeMemoryChallenge(phone, codeHash);
      return code;
    } catch (error) {
      console.error(
        "[otp] mysql store failed, using memory fallback:",
        error instanceof Error ? error.message : error,
      );
      storeMemoryChallenge(phone, codeHash);
      return code;
    }
  }

  storeMemoryChallenge(phone, codeHash);
  return code;
}

export async function discardOtpChallenge(phone: string): Promise<void> {
  await clearPreviousChallenges(phone);
}

export async function verifyOtpChallenge(
  phone: string,
  code: string,
): Promise<{ valid: boolean; message: string }> {
  if (!isValidOtpCode(code)) {
    return { valid: false, message: "کد تأیید نادرست است" };
  }

  const codeHash = hashCode(code);

  if (isMysqlConfigured()) {
    try {
      const data = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM otp_challenges WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [phone],
      );

      if (data) {
        if (new Date(toIso(data.expires_at)).getTime() < Date.now()) {
          try {
            await mysqlExecute("DELETE FROM otp_challenges WHERE id = ?", [
              data.id,
            ]);
          } catch {
            /* ignore */
          }
          getMemory().challenges.delete(phone);
          return { valid: false, message: "کد منقضی شده. دوباره درخواست دهید" };
        }

        if ((data.attempts as number) >= MAX_VERIFY_ATTEMPTS) {
          return {
            valid: false,
            message: "تعداد تلاش بیش از حد. کد جدید بگیرید",
          };
        }

        if (!safeEqualHex(String(data.code_hash), codeHash)) {
          try {
            await mysqlExecute(
              "UPDATE otp_challenges SET attempts = ? WHERE id = ?",
              [(data.attempts as number) + 1, data.id],
            );
          } catch {
            /* ignore — still reject */
          }
          return { valid: false, message: "کد تأیید نادرست است" };
        }

        try {
          await mysqlExecute("DELETE FROM otp_challenges WHERE id = ?", [
            data.id,
          ]);
        } catch {
          /* ignore */
        }
        getMemory().challenges.delete(phone);
        return { valid: true, message: "تأیید شد" };
      }
    } catch (error) {
      console.error(
        "[otp] mysql verify failed, trying memory:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return verifyMemoryChallenge(phone, codeHash);
}

/** @internal */
export function __resetOtpMemoryForTests(): void {
  const mem = getMemory();
  mem.challenges.clear();
  mem.sendLog.clear();
}

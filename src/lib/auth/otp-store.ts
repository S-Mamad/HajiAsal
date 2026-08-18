import { createHmac, randomInt, timingSafeEqual } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQueryOne,
  newId,
  toIso,
} from "@/lib/server/mysql";
import { normalizeOtpDigits } from "@/lib/auth/otp-digits";

export { normalizeOtpDigits } from "@/lib/auth/otp-digits";

/** Default OTP length for self-generated codes (test + Kavenegar/Ghasedak + Melipayamak simple). */
export const OTP_LENGTH = 4;

/**
 * Accepted OTP length range. Melipayamak console OTP can be configured to any
 * length in this range; we store whatever the gateway returns and let the UI
 * render the matching number of inputs.
 */
export const MIN_OTP_LENGTH = 4;
export const MAX_OTP_LENGTH = 10;

/** 10 minutes — SMS delivery on Iranian networks is often delayed. */
const OTP_TTL_MS = 10 * 60 * 1000;
/** Small clock/skew grace so late delivery still verifies. */
const OTP_VERIFY_GRACE_MS = 60_000;

/** Production stays strict; local/E2E need headroom for repeated test-phone logins. */
const MAX_SENDS_PER_WINDOW =
  process.env.NODE_ENV === "production"
    ? 5
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

function getOtpPepper(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SESSION_SECRET is required in production");
    }
    return "dev-only-insecure-otp-pepper";
  }
  return secret;
}

/** HMAC so a leaked otp_challenges table is not a 4-digit rainbow table. */
function hashCode(phone: string, code: string): string {
  return createHmac("sha256", getOtpPepper())
    .update(`${phone}:${code}`)
    .digest("hex");
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

export function generateOtpCode(): string {
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

  if (challenge.expiresAt + OTP_VERIFY_GRACE_MS < Date.now()) {
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
  const digits = normalizeOtpDigits(code);
  return new RegExp(`^\\d{${MIN_OTP_LENGTH},${MAX_OTP_LENGTH}}$`).test(digits);
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
  if (isMysqlUsable()) {
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

  const code = normalizeOtpDigits(fixedCode ?? generateOtpCode());
  if (!isValidOtpCode(code)) {
    throw new Error(
      `OTP must be ${MIN_OTP_LENGTH}-${MAX_OTP_LENGTH} digits`,
    );
  }

  await clearPreviousChallenges(phone);

  const codeHash = hashCode(phone, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  // Memory first so same-process verify never waits on MySQL.
  storeMemoryChallenge(phone, codeHash);

  // Skip MySQL when circuit is open — avoids multi-second connect stalls.
  if (isMysqlUsable()) {
    try {
      await mysqlExecute(
        `INSERT INTO otp_challenges (id, phone, code_hash, expires_at, attempts)
         VALUES (?, ?, ?, ?, 0)`,
        [newId(), phone, codeHash, expiresAt],
      );
      return code;
    } catch (error) {
      console.error(
        "[otp] mysql store failed:",
        error instanceof Error ? error.message : error,
      );
      // Production is multi-instance: memory-only challenges are not safe.
      if (process.env.NODE_ENV === "production") {
        getMemory().challenges.delete(phone);
        throw new Error("خطا در ذخیره کد تأیید");
      }
      return code;
    }
  }

  if (process.env.NODE_ENV === "production" && isMysqlConfigured()) {
    getMemory().challenges.delete(phone);
    throw new Error("سرویس تأیید موقتاً در دسترس نیست");
  }

  return code;
}

export async function discardOtpChallenge(phone: string): Promise<void> {
  await clearPreviousChallenges(phone);
}

export async function verifyOtpChallenge(
  phone: string,
  code: string,
): Promise<{ valid: boolean; message: string }> {
  const normalized = normalizeOtpDigits(code);
  if (!isValidOtpCode(normalized)) {
    return { valid: false, message: "کد تأیید نادرست است" };
  }

  const codeHash = hashCode(phone, normalized);
  // Allow verify until expires_at + grace (same as memory path).
  const graceCutoffIso = new Date(
    Date.now() - OTP_VERIFY_GRACE_MS,
  ).toISOString();

  // Atomic MySQL consume first — closes multi-instance replay (TOCTOU).
  if (isMysqlUsable()) {
    try {
      const consumed = await mysqlExecute(
        `DELETE FROM otp_challenges
         WHERE phone = ?
           AND code_hash = ?
           AND expires_at >= ?
           AND attempts < ?`,
        [phone, codeHash, graceCutoffIso, MAX_VERIFY_ATTEMPTS],
      );
      if (consumed.affectedRows > 0) {
        getMemory().challenges.delete(phone);
        return { valid: true, message: "تأیید شد" };
      }

      const data = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM otp_challenges WHERE phone = ? ORDER BY created_at DESC LIMIT 1",
        [phone],
      );

      if (data) {
        const expiresMs = new Date(toIso(data.expires_at)).getTime();
        if (expiresMs + OTP_VERIFY_GRACE_MS < Date.now()) {
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

        try {
          await mysqlExecute(
            `UPDATE otp_challenges
             SET attempts = attempts + 1
             WHERE id = ? AND attempts < ?`,
            [data.id, MAX_VERIFY_ATTEMPTS],
          );
        } catch {
          /* ignore — still reject */
        }
        const mem = getMemory().challenges.get(phone);
        if (mem) mem.attempts += 1;
        return { valid: false, message: "کد تأیید نادرست است" };
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

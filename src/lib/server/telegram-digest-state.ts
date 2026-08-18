import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQueryOne,
} from "./mysql";
import { tehranDateKey } from "./telegram-sales-stats";

const STATE_KEY = "telegram_digest_state";

export type TelegramDigestState = {
  lastSentDateKey: string;
  lastSentAt: string;
};

type MemoryState = { value: TelegramDigestState | null };

function memoryState(): MemoryState {
  const g = globalThis as typeof globalThis & {
    __hajiasalTelegramDigestState?: MemoryState;
  };
  if (!g.__hajiasalTelegramDigestState) {
    g.__hajiasalTelegramDigestState = { value: null };
  }
  return g.__hajiasalTelegramDigestState;
}

async function ensureTable(): Promise<boolean> {
  if (!isMysqlUsable()) return false;
  try {
    await mysqlExecute(
      `CREATE TABLE IF NOT EXISTS site_settings (
        \`key\` VARCHAR(64) PRIMARY KEY,
        value JSON NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    return true;
  } catch {
    return false;
  }
}

function parseState(raw: unknown): TelegramDigestState | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const lastSentDateKey =
    typeof obj.lastSentDateKey === "string" ? obj.lastSentDateKey : "";
  const lastSentAt = typeof obj.lastSentAt === "string" ? obj.lastSentAt : "";
  if (!lastSentDateKey) return null;
  return { lastSentDateKey, lastSentAt };
}

export async function getTelegramDigestState(): Promise<TelegramDigestState | null> {
  if (isMysqlConfigured()) {
    try {
      await ensureTable();
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT value FROM site_settings WHERE `key` = ? LIMIT 1",
        [STATE_KEY],
      );
      if (row?.value) {
        const value =
          typeof row.value === "string"
            ? (JSON.parse(row.value) as unknown)
            : row.value;
        const state = parseState(value);
        memoryState().value = state;
        return state;
      }
    } catch {
      /* memory */
    }
  }
  return memoryState().value;
}

export async function markTelegramDigestSent(
  dateKey = tehranDateKey(),
): Promise<TelegramDigestState> {
  const next: TelegramDigestState = {
    lastSentDateKey: dateKey,
    lastSentAt: new Date().toISOString(),
  };
  memoryState().value = next;

  if (isMysqlUsable()) {
    try {
      await ensureTable();
      await mysqlExecute(
        `INSERT INTO site_settings (\`key\`, value, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
        [STATE_KEY, JSON.stringify(next), new Date().toISOString()],
      );
    } catch (error) {
      console.error(
        "[telegram-digest-state] persist failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return next;
}

/**
 * Clear claim for a Tehran day so a failed send can be retried by cron.
 * No-op if the stored day does not match (another day already claimed).
 */
export async function clearTelegramDigestClaim(
  dateKey = tehranDateKey(),
): Promise<void> {
  const current = await getTelegramDigestState();
  if (!current || current.lastSentDateKey !== dateKey) return;

  memoryState().value = null;
  if (isMysqlUsable()) {
    try {
      await ensureTable();
      await mysqlExecute("DELETE FROM site_settings WHERE `key` = ?", [
        STATE_KEY,
      ]);
    } catch (error) {
      console.error(
        "[telegram-digest-state] clear failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}

/**
 * Claim today's digest slot. Returns false if already claimed for dateKey.
 */
export async function claimTelegramDigestDay(
  dateKey = tehranDateKey(),
): Promise<boolean> {
  if (await wasDigestSentForDate(dateKey)) return false;
  await markTelegramDigestSent(dateKey);
  return true;
}

/**
 * Returns true if a digest for this Tehran calendar day was already sent.
 */
export async function wasDigestSentForDate(
  dateKey = tehranDateKey(),
): Promise<boolean> {
  const state = await getTelegramDigestState();
  return Boolean(state && state.lastSentDateKey === dateKey);
}

/** @internal */
export function __resetTelegramDigestStateForTests(): void {
  memoryState().value = null;
}

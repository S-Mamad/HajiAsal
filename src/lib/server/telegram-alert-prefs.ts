import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQueryOne,
} from "./mysql";

const PREFS_KEY = "telegram_alerts";

export type TelegramAlertPrefs = {
  funnelMuted: boolean;
};

const DEFAULT_PREFS: TelegramAlertPrefs = {
  funnelMuted: true,
};

type MemoryPrefs = { value: TelegramAlertPrefs };

function memoryPrefs(): MemoryPrefs {
  const g = globalThis as typeof globalThis & {
    __hajiasalTelegramAlertPrefs?: MemoryPrefs;
  };
  if (!g.__hajiasalTelegramAlertPrefs) {
    g.__hajiasalTelegramAlertPrefs = { value: { ...DEFAULT_PREFS } };
  }
  return g.__hajiasalTelegramAlertPrefs;
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

function parsePrefs(raw: unknown): TelegramAlertPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const obj = raw as Record<string, unknown>;
  return {
    funnelMuted: Boolean(obj.funnelMuted),
  };
}

export async function getTelegramAlertPrefs(): Promise<TelegramAlertPrefs> {
  if (isMysqlConfigured()) {
    try {
      await ensureTable();
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT value FROM site_settings WHERE `key` = ? LIMIT 1",
        [PREFS_KEY],
      );
      if (row?.value) {
        const value =
          typeof row.value === "string"
            ? (JSON.parse(row.value) as unknown)
            : row.value;
        const prefs = parsePrefs(value);
        memoryPrefs().value = prefs;
        return prefs;
      }
    } catch {
      /* memory */
    }
  }
  return { ...memoryPrefs().value };
}

export async function setTelegramAlertPrefs(
  patch: Partial<TelegramAlertPrefs>,
): Promise<TelegramAlertPrefs> {
  const current = await getTelegramAlertPrefs();
  const next: TelegramAlertPrefs = {
    funnelMuted:
      patch.funnelMuted !== undefined
        ? Boolean(patch.funnelMuted)
        : current.funnelMuted,
  };
  memoryPrefs().value = next;

  if (isMysqlUsable()) {
    try {
      await ensureTable();
      await mysqlExecute(
        `INSERT INTO site_settings (\`key\`, value, updated_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
        [PREFS_KEY, JSON.stringify(next), new Date().toISOString()],
      );
    } catch (error) {
      console.error(
        "[telegram-alert-prefs] persist failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return next;
}

export async function isFunnelMuted(): Promise<boolean> {
  const prefs = await getTelegramAlertPrefs();
  return prefs.funnelMuted;
}

/** @internal */
export function __resetTelegramAlertPrefsForTests(): void {
  memoryPrefs().value = { ...DEFAULT_PREFS };
}

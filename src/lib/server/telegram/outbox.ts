import type { RowDataPacket } from "mysql2/promise";
import {
  asJson,
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  newId,
  parseJsonField,
  withMysqlTransaction,
} from "../mysql";
import type {
  TelegramNotifyEvent,
  TelegramNotifyResult,
  TelegramOutboxKind,
  TelegramOutboxStatus,
  TelegramPayloadMap,
} from "./events";

export const TELEGRAM_OUTBOX_MAX_ATTEMPTS = 8;
export const TELEGRAM_OUTBOX_CLAIM_LIMIT = 20;

export type TelegramOutboxRow = {
  id: string;
  kind: TelegramOutboxKind;
  event: string;
  payload: unknown;
  chatId: string | null;
  status: TelegramOutboxStatus;
  attempts: number;
  nextAttemptAt: number;
  lastError: string | null;
  telegramMessageId: number | null;
  createdAt: number;
  updatedAt: number;
};

type MemoryBox = {
  rows: TelegramOutboxRow[];
  dlq: TelegramOutboxRow[];
};

function memoryBox(): MemoryBox {
  const g = globalThis as typeof globalThis & {
    __hajiasalTelegramOutbox?: MemoryBox;
  };
  if (!g.__hajiasalTelegramOutbox) {
    g.__hajiasalTelegramOutbox = { rows: [], dlq: [] };
  }
  return g.__hajiasalTelegramOutbox;
}

export function nextBackoffMs(attemptsAfterFailure: number): number {
  if (attemptsAfterFailure <= 1) return 15_000;
  if (attemptsAfterFailure === 2) return 60_000;
  return 5 * 60_000;
}

function toMysqlDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 23).replace("T", " ");
}

let tablesReady = false;

export async function ensureTelegramOutboxTables(): Promise<boolean> {
  if (!isMysqlUsable()) return false;
  if (tablesReady) return true;
  try {
    await mysqlExecute(
      `CREATE TABLE IF NOT EXISTS telegram_outbox (
        id VARCHAR(36) PRIMARY KEY,
        kind ENUM('outbound','inbound','callback') NOT NULL,
        event VARCHAR(64) NOT NULL,
        payload_json JSON NOT NULL,
        chat_id VARCHAR(64) NULL,
        status ENUM('pending','processing','sent','failed','dlq') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        last_error TEXT NULL,
        telegram_message_id BIGINT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
          ON UPDATE CURRENT_TIMESTAMP(3),
        INDEX idx_telegram_outbox_claim (status, next_attempt_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    await mysqlExecute(
      `CREATE TABLE IF NOT EXISTS telegram_dlq (
        id VARCHAR(36) PRIMARY KEY,
        outbox_id VARCHAR(36) NOT NULL,
        kind VARCHAR(16) NOT NULL,
        event VARCHAR(64) NOT NULL,
        payload_json JSON NOT NULL,
        chat_id VARCHAR(64) NULL,
        attempts INT NOT NULL,
        last_error TEXT NULL,
        created_at DATETIME(3) NOT NULL,
        dead_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_telegram_dlq_dead (dead_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    tablesReady = true;
    return true;
  } catch (error) {
    console.error(
      "[telegram-outbox] ensure failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

function mapMysqlRow(row: RowDataPacket): TelegramOutboxRow {
  const created = new Date(row.created_at as string | Date).getTime();
  const updated = new Date(row.updated_at as string | Date).getTime();
  const next = new Date(row.next_attempt_at as string | Date).getTime();
  return {
    id: String(row.id),
    kind: String(row.kind) as TelegramOutboxKind,
    event: String(row.event),
    payload: parseJsonField(row.payload_json, null),
    chatId: row.chat_id == null ? null : String(row.chat_id),
    status: String(row.status) as TelegramOutboxStatus,
    attempts: Number(row.attempts ?? 0),
    nextAttemptAt: Number.isFinite(next) ? next : Date.now(),
    lastError: row.last_error == null ? null : String(row.last_error),
    telegramMessageId:
      row.telegram_message_id == null ? null : Number(row.telegram_message_id),
    createdAt: Number.isFinite(created) ? created : Date.now(),
    updatedAt: Number.isFinite(updated) ? updated : Date.now(),
  };
}

export async function enqueueTelegramOutbox(input: {
  kind: TelegramOutboxKind;
  event: string;
  payload: unknown;
  chatId?: string | number | null;
}): Promise<{ queued: boolean; id?: string; skipped?: string }> {
  const now = Date.now();
  const row: TelegramOutboxRow = {
    id: newId(),
    kind: input.kind,
    event: input.event,
    payload: input.payload,
    chatId: input.chatId == null ? null : String(input.chatId),
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
    telegramMessageId: null,
    createdAt: now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      if (!(await ensureTelegramOutboxTables())) {
        return { queued: false, skipped: "mysql_unavailable" };
      }
      await mysqlExecute(
        `INSERT INTO telegram_outbox
          (id, kind, event, payload_json, chat_id, status, attempts, next_attempt_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
        [
          row.id,
          row.kind,
          row.event,
          asJson(row.payload),
          row.chatId,
          toMysqlDate(row.nextAttemptAt),
          toMysqlDate(row.createdAt),
          toMysqlDate(row.updatedAt),
        ],
      );
      return { queued: true, id: row.id };
    } catch (error) {
      console.error(
        "[telegram-outbox] enqueue failed:",
        input.event,
        error instanceof Error ? error.message : error,
      );
      return { queued: false, skipped: "error" };
    }
  }

  memoryBox().rows.push(row);
  return { queued: true, id: row.id };
}

export async function enqueueTelegramEvent<E extends TelegramNotifyEvent>(
  event: E,
  payload: TelegramPayloadMap[E],
  chatId?: string | number | null,
): Promise<TelegramNotifyResult & { queued: boolean; id?: string }> {
  const result = await enqueueTelegramOutbox({
    kind: "outbound",
    event,
    payload,
    chatId,
  });
  if (!result.queued) {
    return {
      sent: false,
      queued: false,
      skipped: result.skipped ?? "enqueue_failed",
    };
  }
  return { sent: true, queued: true, skipped: "queued", id: result.id };
}

async function claimMysql(limit: number, now: number): Promise<TelegramOutboxRow[]> {
  const ids: string[] = [];
  try {
    await withMysqlTransaction(async (conn) => {
      const [locked] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM telegram_outbox
         WHERE status = 'pending' AND next_attempt_at <= ?
         ORDER BY created_at ASC
         LIMIT ${limit}
         FOR UPDATE SKIP LOCKED`,
        [toMysqlDate(now)],
      );
      for (const row of locked) {
        ids.push(String(row.id));
      }
      if (ids.length === 0) return;
      const placeholders = ids.map(() => "?").join(",");
      await conn.execute(
        `UPDATE telegram_outbox SET status = 'processing', updated_at = ?
         WHERE id IN (${placeholders}) AND status = 'pending'`,
        [toMysqlDate(now), ...ids],
      );
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!/SKIP LOCKED/i.test(msg)) {
      console.error("[telegram-outbox] claim failed:", msg);
      return [];
    }
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT id FROM telegram_outbox
         WHERE status = 'pending' AND next_attempt_at <= ?
         ORDER BY created_at ASC
         LIMIT ${limit}`,
        [toMysqlDate(now)],
      );
      for (const row of rows) ids.push(String(row.id));
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        await mysqlExecute(
          `UPDATE telegram_outbox SET status = 'processing', updated_at = ?
           WHERE id IN (${placeholders}) AND status = 'pending'`,
          [toMysqlDate(now), ...ids],
        );
      }
    } catch (fallbackError) {
      console.error(
        "[telegram-outbox] claim fallback failed:",
        fallbackError instanceof Error ? fallbackError.message : fallbackError,
      );
      return [];
    }
  }

  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const rows = await mysqlQuery<RowDataPacket>(
    `SELECT * FROM telegram_outbox WHERE id IN (${placeholders})`,
    ids,
  );
  return rows.map(mapMysqlRow).filter((row) => row.status === "processing");
}

function claimMemory(limit: number, now: number): TelegramOutboxRow[] {
  const claimed: TelegramOutboxRow[] = [];
  for (const row of memoryBox().rows) {
    if (claimed.length >= limit) break;
    if (row.status !== "pending" || row.nextAttemptAt > now) continue;
    row.status = "processing";
    row.updatedAt = now;
    claimed.push(row);
  }
  return claimed;
}

export async function claimTelegramOutbox(
  limit = TELEGRAM_OUTBOX_CLAIM_LIMIT,
): Promise<TelegramOutboxRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const now = Date.now();
  if (isMysqlConfigured()) {
    if (!(await ensureTelegramOutboxTables())) return [];
    return claimMysql(safeLimit, now);
  }
  return claimMemory(safeLimit, now);
}

export async function markTelegramOutboxSent(
  id: string,
  telegramMessageId?: number | null,
): Promise<void> {
  const now = Date.now();
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `UPDATE telegram_outbox
       SET status = 'sent', last_error = NULL, telegram_message_id = ?, updated_at = ?
       WHERE id = ?`,
      [telegramMessageId ?? null, toMysqlDate(now), id],
    );
    return;
  }
  const row = memoryBox().rows.find((item) => item.id === id);
  if (!row) return;
  row.status = "sent";
  row.lastError = null;
  row.telegramMessageId = telegramMessageId ?? row.telegramMessageId;
  row.updatedAt = now;
}

export async function markTelegramOutboxRetry(
  row: TelegramOutboxRow,
  error: string,
): Promise<"retry" | "dlq"> {
  const now = Date.now();
  const attempts = row.attempts + 1;
  if (attempts >= TELEGRAM_OUTBOX_MAX_ATTEMPTS) {
    await markTelegramOutboxDlq({ ...row, attempts, lastError: error });
    return "dlq";
  }
  const nextAttemptAt = now + nextBackoffMs(attempts);
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `UPDATE telegram_outbox
       SET status = 'pending', attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = ?
       WHERE id = ?`,
      [attempts, toMysqlDate(nextAttemptAt), error.slice(0, 500), toMysqlDate(now), row.id],
    );
    return "retry";
  }
  const mem = memoryBox().rows.find((item) => item.id === row.id);
  if (mem) {
    mem.status = "pending";
    mem.attempts = attempts;
    mem.nextAttemptAt = nextAttemptAt;
    mem.lastError = error.slice(0, 500);
    mem.updatedAt = now;
  }
  return "retry";
}

export async function markTelegramOutboxDlq(
  row: TelegramOutboxRow,
): Promise<void> {
  const now = Date.now();
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `UPDATE telegram_outbox
       SET status = 'dlq', attempts = ?, last_error = ?, updated_at = ?
       WHERE id = ?`,
      [row.attempts, (row.lastError ?? "dlq").slice(0, 500), toMysqlDate(now), row.id],
    );
    await mysqlExecute(
      `INSERT INTO telegram_dlq
        (id, outbox_id, kind, event, payload_json, chat_id, attempts, last_error, created_at, dead_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        row.id,
        row.kind,
        row.event,
        asJson(row.payload),
        row.chatId,
        row.attempts,
        (row.lastError ?? "dlq").slice(0, 500),
        toMysqlDate(row.createdAt),
        toMysqlDate(now),
      ],
    );
    return;
  }
  const mem = memoryBox().rows.find((item) => item.id === row.id);
  if (mem) {
    mem.status = "dlq";
    mem.attempts = row.attempts;
    mem.lastError = row.lastError;
    mem.updatedAt = now;
    memoryBox().dlq.push({ ...mem });
  }
}

export async function countTelegramDlq(): Promise<number> {
  if (isMysqlConfigured()) {
    try {
      if (!(await ensureTelegramOutboxTables())) return 0;
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT COUNT(*) AS n FROM telegram_dlq",
      );
      return Number(row?.n ?? 0);
    } catch {
      return 0;
    }
  }
  return memoryBox().dlq.length;
}

export async function countTelegramOutboxPending(): Promise<number> {
  if (isMysqlConfigured()) {
    try {
      if (!(await ensureTelegramOutboxTables())) return 0;
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT COUNT(*) AS n FROM telegram_outbox WHERE status = 'pending'",
      );
      return Number(row?.n ?? 0);
    } catch {
      return 0;
    }
  }
  return memoryBox().rows.filter((row) => row.status === "pending").length;
}

/** @internal */
export function __resetTelegramOutboxForTests(): void {
  const box = memoryBox();
  box.rows.splice(0, box.rows.length);
  box.dlq.splice(0, box.dlq.length);
  tablesReady = false;
}

/** @internal */
export function __getTelegramOutboxMemoryForTests(): MemoryBox {
  return memoryBox();
}

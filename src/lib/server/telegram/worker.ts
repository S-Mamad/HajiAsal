import type { StoredOrder } from "../orders";
import { getOrderById, updateOrderAdmin } from "../orders";
import {
  isTelegramBotConfigured,
  isTelegramChatAllowed,
  isTelegramNotifyEnabled,
} from "./config";
import {
  answerTelegramCallbackQuery,
  editTelegramMessage,
  sendTelegramMessage,
} from "./client";
import { parseTelegramCallbackData } from "./callbacks";
import { handleTelegramCommand } from "./commands";
import type {
  OrderCreatedPayload,
  OrderPaidPayload,
  TelegramNotifyEvent,
  TelegramNotifyResult,
  TicketNewPayload,
} from "./events";
import {
  buildOrderCreatedBatchTemplate,
  buildOrderReplyMarkup,
  buildTelegramTemplate,
  buildTicketReplyMarkup,
} from "./format";
import { enrichTicketNewHtml } from "./gemini-ticket";
import {
  claimTelegramOutbox,
  markTelegramOutboxRetry,
  markTelegramOutboxSent,
  TELEGRAM_OUTBOX_CLAIM_LIMIT,
  type TelegramOutboxRow,
} from "./outbox";

const ORDER_CREATED_BATCH_WINDOW_MS = 10_000;

export type TelegramOutboxProcessStats = {
  claimed: number;
  sent: number;
  retried: number;
  dlq: number;
  skipped: number;
};

function emptyStats(): TelegramOutboxProcessStats {
  return { claimed: 0, sent: 0, retried: 0, dlq: 0, skipped: 0 };
}

function asEvent(event: string): TelegramNotifyEvent | null {
  return event as TelegramNotifyEvent;
}

function orderFromPayload(payload: unknown): StoredOrder | null {
  if (!payload || typeof payload !== "object") return null;
  const order = (payload as { order?: StoredOrder }).order;
  return order && typeof order.id === "string" ? order : null;
}

function groupOrderCreatedBatches(rows: TelegramOutboxRow[]): {
  batches: TelegramOutboxRow[][];
  rest: TelegramOutboxRow[];
} {
  const created = rows.filter(
    (row) => row.kind === "outbound" && row.event === "order.created",
  );
  const rest = rows.filter(
    (row) => !(row.kind === "outbound" && row.event === "order.created"),
  );
  if (created.length < 2) {
    return { batches: [], rest: [...rest, ...created] };
  }
  const min = Math.min(...created.map((row) => row.createdAt));
  const max = Math.max(...created.map((row) => row.createdAt));
  if (max - min > ORDER_CREATED_BATCH_WINDOW_MS) {
    return { batches: [], rest: [...rest, ...created] };
  }
  return { batches: [created], rest };
}

async function finishRow(
  row: TelegramOutboxRow,
  result: TelegramNotifyResult & { messageId?: number },
  stats: TelegramOutboxProcessStats,
): Promise<void> {
  if (result.sent) {
    await markTelegramOutboxSent(row.id, result.messageId ?? null);
    stats.sent += 1;
    return;
  }
  if (result.skipped) {
    await markTelegramOutboxSent(row.id, null);
    stats.skipped += 1;
    return;
  }
  const next = await markTelegramOutboxRetry(
    row,
    result.error ?? "send_failed",
  );
  if (next === "dlq") stats.dlq += 1;
  else stats.retried += 1;
}

async function processOutbound(
  row: TelegramOutboxRow,
  stats: TelegramOutboxProcessStats,
): Promise<void> {
  if (!isTelegramNotifyEnabled()) {
    await markTelegramOutboxSent(row.id, null);
    stats.skipped += 1;
    return;
  }
  const event = asEvent(row.event);
  if (!event) {
    await markTelegramOutboxRetry(row, "unknown_event");
    stats.retried += 1;
    return;
  }

  let text = buildTelegramTemplate(event, row.payload);
  let replyMarkup = undefined;

  if (event === "ticket.new") {
    text = await enrichTicketNewHtml(row.payload as TicketNewPayload, text);
    const ticket = row.payload as TicketNewPayload;
    replyMarkup = buildTicketReplyMarkup(ticket.id);
  } else if (event === "order.created" || event === "order.paid") {
    const order =
      event === "order.created"
        ? (row.payload as OrderCreatedPayload).order
        : (row.payload as OrderPaidPayload).order;
    if (order) replyMarkup = buildOrderReplyMarkup(order);
  }

  const result = await sendTelegramMessage(text, { replyMarkup });
  await finishRow(row, result, stats);
}

async function processOrderCreatedBatch(
  rows: TelegramOutboxRow[],
  stats: TelegramOutboxProcessStats,
): Promise<void> {
  if (!isTelegramNotifyEnabled()) {
    for (const row of rows) {
      await markTelegramOutboxSent(row.id, null);
      stats.skipped += 1;
    }
    return;
  }
  const orders = rows
    .map((row) => orderFromPayload(row.payload))
    .filter((order): order is StoredOrder => Boolean(order));
  const text = buildOrderCreatedBatchTemplate(orders);
  const result = await sendTelegramMessage(text);
  for (const row of rows) {
    await finishRow(row, result, stats);
  }
}

async function processInbound(
  row: TelegramOutboxRow,
  stats: TelegramOutboxProcessStats,
): Promise<void> {
  const payload = row.payload as { chatId?: string; text?: string };
  const chatId = payload.chatId ?? row.chatId;
  const text = payload.text ?? "";
  if (!chatId || !text) {
    await markTelegramOutboxSent(row.id, null);
    stats.skipped += 1;
    return;
  }
  if (!isTelegramChatAllowed(chatId)) {
    await markTelegramOutboxSent(row.id, null);
    stats.skipped += 1;
    return;
  }
  try {
    await handleTelegramCommand(String(chatId), text);
    await markTelegramOutboxSent(row.id, null);
    stats.sent += 1;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const next = await markTelegramOutboxRetry(row, msg);
    if (next === "dlq") stats.dlq += 1;
    else stats.retried += 1;
  }
}

async function processCallback(
  row: TelegramOutboxRow,
  stats: TelegramOutboxProcessStats,
): Promise<void> {
  const payload = row.payload as {
    callbackQueryId?: string;
    data?: string;
    chatId?: string;
    messageId?: number | null;
  };
  const chatId = payload.chatId ?? row.chatId;
  const callbackQueryId = payload.callbackQueryId ?? "";
  if (!chatId || !isTelegramChatAllowed(chatId) || !payload.data) {
    if (callbackQueryId) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: "اجازه ندارید.",
      });
    }
    await markTelegramOutboxSent(row.id, null);
    stats.skipped += 1;
    return;
  }

  const parsed = parseTelegramCallbackData(payload.data);
  if (!parsed.ok) {
    await answerTelegramCallbackQuery({
      callbackQueryId,
      text: "دکمه نامعتبر است.",
    });
    await markTelegramOutboxSent(row.id, null);
    stats.skipped += 1;
    return;
  }

  try {
    const order = await getOrderById(parsed.data.orderId);
    if (!order) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: "سفارش یافت نشد.",
      });
      await markTelegramOutboxSent(row.id, null);
      stats.skipped += 1;
      return;
    }

    if (parsed.data.action === "cancel") {
      if (order.status !== "pending_payment") {
        await answerTelegramCallbackQuery({
          callbackQueryId,
          text: "فقط سفارش در انتظار پرداخت قابل لغو از تلگرام است.",
        });
        await markTelegramOutboxSent(row.id, null);
        stats.skipped += 1;
        return;
      }
      const updated = await updateOrderAdmin(order.id, {
        status: "cancelled",
        adminNote: "لغو از تلگرام ادمین",
      });
      const next = updated ?? order;
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: "سفارش لغو شد.",
      });
      if (payload.messageId) {
        await editTelegramMessage({
          chatId,
          messageId: payload.messageId,
          text: buildTelegramTemplate("order.cancelled", {
            order: next,
            prevStatus: order.status,
            nextStatus: "cancelled",
          }),
          replyMarkup: buildOrderReplyMarkup(next),
        });
      }
      await markTelegramOutboxSent(row.id, payload.messageId ?? null);
      stats.sent += 1;
      return;
    }

    if (order.status !== "confirmed") {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: "فقط سفارش پرداخت‌شده را می‌توان به آماده‌سازی برد.",
      });
      await markTelegramOutboxSent(row.id, null);
      stats.skipped += 1;
      return;
    }
    const updated = await updateOrderAdmin(order.id, {
      status: "processing",
    });
    const next = updated ?? { ...order, status: "processing" as const };
    await answerTelegramCallbackQuery({
      callbackQueryId,
      text: "وضعیت: در حال آماده‌سازی",
    });
    if (payload.messageId) {
      await editTelegramMessage({
        chatId,
        messageId: payload.messageId,
        text: buildTelegramTemplate("order.status_changed", {
          order: next,
          prevStatus: order.status,
          nextStatus: "processing",
        }),
        replyMarkup: buildOrderReplyMarkup(next),
      });
    }
    await markTelegramOutboxSent(row.id, payload.messageId ?? null);
    stats.sent += 1;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await answerTelegramCallbackQuery({
      callbackQueryId,
      text: "خطای موقت. بعداً دوباره تلاش کنید.",
    }).catch(() => undefined);
    const next = await markTelegramOutboxRetry(row, msg);
    if (next === "dlq") stats.dlq += 1;
    else stats.retried += 1;
  }
}

export async function processTelegramOutbox(
  limit = TELEGRAM_OUTBOX_CLAIM_LIMIT,
): Promise<TelegramOutboxProcessStats> {
  const stats = emptyStats();
  if (!isTelegramBotConfigured()) {
    return stats;
  }

  const claimed = await claimTelegramOutbox(limit);
  stats.claimed = claimed.length;
  if (claimed.length === 0) return stats;

  const { batches, rest } = groupOrderCreatedBatches(claimed);
  for (const batch of batches) {
    await processOrderCreatedBatch(batch, stats);
  }

  for (const row of rest) {
    if (row.kind === "inbound") {
      await processInbound(row, stats);
      continue;
    }
    if (row.kind === "callback") {
      await processCallback(row, stats);
      continue;
    }
    await processOutbound(row, stats);
  }

  return stats;
}

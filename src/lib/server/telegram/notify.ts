import { isMysqlConfigured } from "../mysql";
import type { TelegramNotifyEvent, TelegramNotifyResult, TelegramPayloadMap } from "./events";
import { isTelegramNotifyEnabled } from "./config";
import { enqueueTelegramEvent } from "./outbox";
import { processTelegramOutbox } from "./worker";
import { wakeTelegramOutboxWorker } from "./wake";

/**
 * Persist an alert and return quickly. Never throws.
 * Storefront: INSERT + optional 2s wake of admin cron.
 * Local/tests without MySQL: process immediately when notify is enabled.
 */
export async function notifyTelegram<E extends TelegramNotifyEvent>(
  event: E,
  payload: TelegramPayloadMap[E],
): Promise<TelegramNotifyResult> {
  try {
    if (!isMysqlConfigured() && !isTelegramNotifyEnabled()) {
      return { sent: false, skipped: "disabled" };
    }

    const queued = await enqueueTelegramEvent(event, payload);
    if (!queued.queued) {
      return { sent: false, skipped: queued.skipped ?? "enqueue_failed" };
    }

    if (!isMysqlConfigured()) {
      const stats = await processTelegramOutbox();
      if (stats.sent > 0) return { sent: true };
      if (stats.skipped > 0 && stats.retried === 0 && stats.dlq === 0) {
        return { sent: false, skipped: "skipped" };
      }
      return { sent: false, error: "send_failed" };
    }

    void wakeTelegramOutboxWorker();
    return { sent: true, skipped: "queued" };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[telegram-notify]", event, msg);
    return { sent: false, error: msg };
  }
}

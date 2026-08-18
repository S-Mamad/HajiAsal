import {
  notifyTelegram,
  type TelegramNotifyEvent,
  type TelegramPayloadMap,
} from "./telegram-notify";
import { isMysqlConfigured } from "./mysql";
import { isTelegramNotifyEnabled } from "./telegram/config";
import { enqueueTelegramEvent } from "./telegram/outbox";
import { wakeTelegramOutboxWorker } from "./telegram/wake";

export type AlertPriority = "P0" | "P1";

/**
 * Fire-and-forget enqueue into MySQL outbox (or memory in tests).
 * Never waits for Telegram.
 */
export async function enqueueTelegramAlert<E extends TelegramNotifyEvent>(
  event: E,
  payload: TelegramPayloadMap[E],
  _options?: { priority?: AlertPriority },
): Promise<{ queued: boolean; skipped?: string }> {
  try {
    if (!isMysqlConfigured() && !isTelegramNotifyEnabled()) {
      return { queued: false, skipped: "disabled" };
    }
    const result = await enqueueTelegramEvent(event, payload);
    if (result.queued) {
      void wakeTelegramOutboxWorker();
      return { queued: true, skipped: result.skipped };
    }
    return { queued: false, skipped: result.skipped ?? "enqueue_failed" };
  } catch (error) {
    console.error(
      "[telegram-alert-queue]",
      event,
      error instanceof Error ? error.message : error,
    );
    return { queued: false, skipped: "error" };
  }
}

/** Kept so older call sites that imported notify via this module still typecheck. */
export { notifyTelegram };

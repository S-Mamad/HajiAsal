import { adminPublicUrl, hajiasalPath } from "@/lib/paths";
import { getAppRole } from "../app-role";
import { isTelegramBotConfigured } from "./config";
import { processTelegramOutbox } from "./worker";

const WAKE_TIMEOUT_MS = 2_000;

export function getTelegramOutboxWakeUrl(): string {
  const explicit = (process.env.TELEGRAM_OUTBOX_WAKE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;
  return `${adminPublicUrl()}${hajiasalPath("/api/cron/telegram-outbox")}`;
}

export async function wakeTelegramOutboxWorker(): Promise<void> {
  const role = getAppRole();
  if (role === "admin" || role === "all") {
    if (!isTelegramBotConfigured()) return;
    void processTelegramOutbox().catch((error) => {
      console.error(
        "[telegram-outbox] local process",
        error instanceof Error ? error.message : error,
      );
    });
    return;
  }

  const secret = process.env.CRON_SECRET?.trim();
  const url = getTelegramOutboxWakeUrl();
  if (!secret || !url) return;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
  } catch {
    /* cron is the safety net */
  } finally {
    clearTimeout(timer);
  }
}

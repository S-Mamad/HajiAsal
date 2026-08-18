import { Agent } from "undici";
import type { TelegramNotifyResult } from "./events";
import {
  getTelegramAdminChatIds,
  getTelegramApiBaseUrl,
  getTelegramBotToken,
  isTelegramBotConfigured,
  isTelegramChatAllowed,
} from "./config";
import { escapeHtml, type TelegramReplyMarkup } from "./format";

const TELEGRAM_TEXT_LIMIT = 4000;
const TELEGRAM_FETCH_TIMEOUT_MS = 12_000;

type TelegramAgent = Agent;

function telegramAgentHolder(): { current: TelegramAgent | null } {
  const g = globalThis as typeof globalThis & {
    __hajiasalTelegramAgent?: { current: TelegramAgent | null };
  };
  if (!g.__hajiasalTelegramAgent) {
    g.__hajiasalTelegramAgent = { current: null };
  }
  return g.__hajiasalTelegramAgent;
}

function getTelegramAgent(): TelegramAgent {
  const holder = telegramAgentHolder();
  if (!holder.current) {
    holder.current = new Agent({
      keepAliveTimeout: 30_000,
      keepAliveMaxTimeout: 60_000,
      connections: 8,
    });
  }
  return holder.current;
}

function telegramBotUrl(token: string, method: string): string {
  const base = getTelegramApiBaseUrl();
  const m = method.replace(/^\//, "");
  return `${base}/bot${token}/${m}`;
}

function telegramProxyHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
  const proxySecret = process.env.TELEGRAM_PROXY_SECRET?.trim();
  if (proxySecret) {
    headers["X-Telegram-Proxy-Secret"] = proxySecret;
  }
  return headers;
}

export async function telegramApiFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      dispatcher: getTelegramAgent(),
    } as RequestInit);
  } finally {
    clearTimeout(timer);
  }
}

function clipText(text: string): string {
  if (text.length <= TELEGRAM_TEXT_LIMIT) return text;
  return `${text.slice(0, TELEGRAM_TEXT_LIMIT - 20)}\n...`;
}

export type TelegramSendResult = TelegramNotifyResult & {
  messageId?: number;
};

type TelegramApiJson = {
  ok?: boolean;
  description?: string;
  result?: { message_id?: number };
};

async function parseTelegramResponse(
  res: Response,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
  const json = (await res.json().catch(() => null)) as TelegramApiJson | null;
  if (json && json.ok === false) {
    return { ok: false, error: json.description ?? "telegram_api_error" };
  }
  const messageId = json?.result?.message_id;
  return {
    ok: true,
    messageId: typeof messageId === "number" ? messageId : undefined,
  };
}

export async function sendTelegramMessage(
  text: string,
  options?: {
    parseMode?: "HTML" | "MarkdownV2";
    chatIds?: string[];
    replyMarkup?: TelegramReplyMarkup;
  },
): Promise<TelegramSendResult> {
  if (!isTelegramBotConfigured()) {
    return { sent: false, skipped: "disabled" };
  }
  const token = getTelegramBotToken();
  const chatIds = options?.chatIds?.length
    ? options.chatIds
    : getTelegramAdminChatIds();
  if (chatIds.length === 0) {
    return { sent: false, skipped: "no_chat_ids" };
  }

  const parseMode = options?.parseMode ?? "HTML";
  const bodyText = clipText(text);
  let anyOk = false;
  let lastError: string | undefined;
  let lastMessageId: number | undefined;
  const endpoint = telegramBotUrl(token, "sendMessage");

  for (const chatId of chatIds) {
    try {
      const res = await telegramApiFetch(endpoint, {
        method: "POST",
        headers: telegramProxyHeaders(),
        body: JSON.stringify({
          chat_id: chatId,
          text: bodyText,
          parse_mode: parseMode,
          disable_web_page_preview: true,
          reply_markup: options?.replyMarkup,
        }),
      });
      const parsed = await parseTelegramResponse(res);
      if (!parsed.ok) {
        lastError = parsed.error;
        console.error("[telegram-client] send failed", chatId, lastError);
        continue;
      }
      anyOk = true;
      lastMessageId = parsed.messageId ?? lastMessageId;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error("[telegram-client] fetch error", chatId, lastError);
    }
  }

  if (!anyOk) {
    return { sent: false, error: lastError ?? "send_failed" };
  }
  return { sent: true, messageId: lastMessageId };
}

export async function editTelegramMessage(options: {
  chatId: string | number;
  messageId: number;
  text: string;
  replyMarkup?: TelegramReplyMarkup;
}): Promise<TelegramNotifyResult> {
  if (!isTelegramBotConfigured()) {
    return { sent: false, skipped: "disabled" };
  }
  if (!isTelegramChatAllowed(options.chatId)) {
    return { sent: false, skipped: "chat_not_allowed" };
  }
  const token = getTelegramBotToken();
  try {
    const res = await telegramApiFetch(telegramBotUrl(token, "editMessageText"), {
      method: "POST",
      headers: telegramProxyHeaders(),
      body: JSON.stringify({
        chat_id: String(options.chatId),
        message_id: options.messageId,
        text: clipText(options.text),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: options.replyMarkup,
      }),
    });
    const parsed = await parseTelegramResponse(res);
    if (!parsed.ok) {
      return { sent: false, error: parsed.error };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function answerTelegramCallbackQuery(options: {
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}): Promise<TelegramNotifyResult> {
  if (!isTelegramBotConfigured()) {
    return { sent: false, skipped: "disabled" };
  }
  const token = getTelegramBotToken();
  try {
    const res = await telegramApiFetch(
      telegramBotUrl(token, "answerCallbackQuery"),
      {
        method: "POST",
        headers: telegramProxyHeaders(),
        body: JSON.stringify({
          callback_query_id: options.callbackQueryId,
          text: options.text,
          show_alert: options.showAlert ?? false,
        }),
      },
    );
    const parsed = await parseTelegramResponse(res);
    if (!parsed.ok) {
      return { sent: false, error: parsed.error };
    }
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendTelegramAdminTestPing(): Promise<
  TelegramNotifyResult & { chatCount: number }
> {
  const chatCount = getTelegramAdminChatIds().length;
  const when = new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  const text = [
    "✅ <b>تست ربات حاجی‌عسل</b>",
    "این یک پیام آزمایشی امن است؛ فقط برای چت‌های ادمین ارسال می‌شود.",
    `<b>زمان:</b> ${escapeHtml(when)}`,
  ].join("\n");
  const result = await sendTelegramMessage(text);
  return { ...result, chatCount };
}

export async function replyTelegramChat(
  chatId: string | number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<TelegramNotifyResult> {
  try {
    if (!isTelegramBotConfigured()) {
      return { sent: false, skipped: "disabled" };
    }
    if (!isTelegramChatAllowed(chatId)) {
      return { sent: false, skipped: "chat_not_allowed" };
    }
    return await sendTelegramMessage(text, {
      chatIds: [String(chatId)],
      replyMarkup,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[telegram-client] reply", msg);
    return { sent: false, error: msg };
  }
}

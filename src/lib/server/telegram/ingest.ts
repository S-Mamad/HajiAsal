import { isTelegramChatAllowed } from "./config";
import { enqueueTelegramOutbox } from "./outbox";

export type TelegramIngestResult = {
  queued: boolean;
  ignored?: string;
  kind?: "inbound" | "callback";
};

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number };
    message?: {
      message_id?: number;
      chat?: { id?: number };
      text?: string;
    };
  };
};

export async function ingestTelegramUpdate(
  update: unknown,
): Promise<TelegramIngestResult> {
  if (!update || typeof update !== "object") {
    return { queued: false, ignored: "empty" };
  }
  const body = update as TelegramUpdate;

  const callback = body.callback_query;
  if (callback?.id && callback.data) {
    const chatId = callback.message?.chat?.id ?? callback.from?.id;
    if (chatId == null) return { queued: false, ignored: "no_chat" };
    if (!isTelegramChatAllowed(chatId)) {
      return { queued: false, ignored: "chat" };
    }
    const queued = await enqueueTelegramOutbox({
      kind: "callback",
      event: "callback_query",
      chatId,
      payload: {
        callbackQueryId: callback.id,
        data: callback.data,
        chatId: String(chatId),
        messageId: callback.message?.message_id ?? null,
      },
    });
    return {
      queued: queued.queued,
      kind: "callback",
      ignored: queued.skipped,
    };
  }

  const chatId = body.message?.chat?.id;
  const text = (body.message?.text ?? "").trim();
  if (chatId == null || !text) {
    return { queued: false, ignored: "empty" };
  }
  if (!isTelegramChatAllowed(chatId)) {
    return { queued: false, ignored: "chat" };
  }
  if (!text.startsWith("/")) {
    return { queued: false, ignored: "not_command" };
  }

  const queued = await enqueueTelegramOutbox({
    kind: "inbound",
    event: "command",
    chatId,
    payload: { chatId: String(chatId), text },
  });
  return { queued: queued.queued, kind: "inbound", ignored: queued.skipped };
}

export function getTelegramAdminChatIds(): string[] {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isTelegramBotConfigured(): boolean {
  return (
    Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) &&
    getTelegramAdminChatIds().length > 0
  );
}

export function isTelegramNotifyEnabled(): boolean {
  const flag = (process.env.TELEGRAM_NOTIFY_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (flag !== "true" && flag !== "1") return false;
  return isTelegramBotConfigured();
}

export function isTelegramChatAllowed(chatId: string | number): boolean {
  return getTelegramAdminChatIds().includes(String(chatId));
}

export function getTelegramApiBaseUrl(): string {
  const raw = (
    process.env.TELEGRAM_API_BASE_URL || "https://api.telegram.org"
  ).trim();
  return raw.replace(/\/$/, "") || "https://api.telegram.org";
}

export function getTelegramBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
}

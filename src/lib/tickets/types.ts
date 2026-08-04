export type TicketChannel = "customer" | "seller";

export type TicketStatus =
  | "open"
  | "waiting"
  | "pending"
  | "answered"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high";

export type TicketSenderType =
  | "customer"
  | "seller"
  | "admin"
  | "system";

export const TICKET_STATUSES: TicketStatus[] = [
  "open",
  "waiting",
  "pending",
  "answered",
  "resolved",
  "closed",
];

export const OPEN_TICKET_STATUSES: TicketStatus[] = [
  "open",
  "waiting",
  "pending",
  "answered",
];

export const BADGE_TICKET_STATUSES = new Set([
  "open",
  "waiting",
  "pending",
  "answered",
  "new",
]);

export type TicketMessageDelivery = "sending" | "sent" | "delivered" | "read" | "failed";

export type TicketMessage = {
  id: string;
  senderType: string;
  senderId?: string | null;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  createdAt: string;
  clientMessageId?: string | null;
  replyToId?: string | null;
  isInternal?: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  delivery?: TicketMessageDelivery;
};

export type UnifiedTicketListItem = {
  id: string;
  channel: TicketChannel;
  subject: string;
  status: string;
  priority: string;
  partyName?: string | null;
  partyPhone?: string | null;
  sellerId?: string | null;
  customerId?: string | null;
  assignedTo?: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
  department?: string | null;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
};

export function isTicketClosed(status: string): boolean {
  return status === "closed" || status === "resolved";
}

export function statusAfterSenderReply(
  senderType: TicketSenderType,
): TicketStatus {
  if (senderType === "admin") return "pending";
  if (senderType === "system") return "open";
  return "waiting";
}

export const ALLOWED_CHAT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export const MAX_CHAT_FILE_BYTES = 5_000_000;

export const BLOCKED_CHAT_EXTENSIONS = new Set([
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".js",
  ".msi",
  ".dll",
  ".php",
  ".py",
]);

/** Mask card-like and password-like patterns before persist. */
export function maskSensitiveText(input: string): string {
  return input
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[CARD_MASKED]")
    .replace(/(رمز(?:\s*عبور)?|password|passwd)\s*[:=]?\s*\S+/gi, "$1: [MASKED]");
}

export function validateChatFile(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  const ext = `.${(file.name.split(".").pop() ?? "").toLowerCase()}`;
  if (BLOCKED_CHAT_EXTENSIONS.has(ext)) {
    return { ok: false, error: "فرمت فایل اجرایی مجاز نیست" };
  }
  if (!ALLOWED_CHAT_MIME.has(file.type)) {
    return { ok: false, error: "فقط تصویر JPEG/PNG/WebP/GIF یا PDF" };
  }
  if (file.size > MAX_CHAT_FILE_BYTES) {
    return { ok: false, error: "حداکثر حجم فایل ۵ مگابایت است" };
  }
  return { ok: true };
}

export const DEFAULT_CANNED: Array<{
  shortcut: string;
  title: string;
  body: string;
}> = [
  {
    shortcut: "/hello",
    title: "سلام",
    body: "سلام، وقت بخیر. لطفاً جزئیات بیشتری از مشکل بفرمایید تا سریع‌تر کمکتان کنیم.",
  },
  {
    shortcut: "/refund",
    title: "عودت وجه",
    body: "درخواست عودت وجه شما ثبت شد. معمولاً تا ۷۲ ساعت کاری نتیجه اعلام می‌شود.",
  },
  {
    shortcut: "/order",
    title: "شماره سفارش",
    body: "لطفاً شماره سفارش خود را ارسال کنید تا وضعیت را بررسی کنیم.",
  },
  {
    shortcut: "/close",
    title: "بستن با رضایت",
    body: "اگر مشکل برطرف شده، این گفتگو را می‌بندیم. در صورت نیاز دوباره تیکت باز کنید.",
  },
];

export function detectDepartmentFromText(text: string): string {
  const t = text.toLowerCase();
  if (/درگاه|پرداخت|بانک|زرین|refund|عودت|کارت/.test(t)) return "finance";
  if (/ارسال|پست|پیک|حمل|تحویل/.test(t)) return "shipping";
  if (/فروشنده|seller|کمیسیون/.test(t)) return "sellers";
  return "general";
}

export const AUTO_CLOSE_PENDING_DAYS = 7;

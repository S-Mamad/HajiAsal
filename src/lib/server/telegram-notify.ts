import { formatJalaliDate, formatPrice } from "@/lib/utils";
import { adminPublicUrl, hajiasalPath } from "@/lib/paths";
import type { StoredOrder } from "./orders";

export type TelegramNotifyEvent =
  | "order.paid"
  | "order.status_changed"
  | "order.cancelled"
  | "order.refunded"
  | "order.payment_failed"
  | "contact.message"
  | "newsletter.subscribe"
  | "seller.application_new"
  | "seller.application_status"
  | "ticket.new"
  | "inventory.out_of_stock"
  | "digest"
  | "command_reply";

export type TelegramNotifyResult = {
  sent: boolean;
  skipped?: string;
  error?: string;
};

export type OrderPaidPayload = {
  order: StoredOrder;
};

export type OrderStatusPayload = {
  order: StoredOrder;
  prevStatus?: string;
  nextStatus?: string;
};

export type OrderPaymentFailedPayload = {
  orderId: string;
  gateway?: string;
  reason?: "failed" | "cancelled" | "amount_mismatch";
};

export type ContactMessagePayload = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subject: string;
  message: string;
};

export type NewsletterSubscribePayload = {
  email: string;
};

export type SellerApplicationPayload = {
  id: string;
  fullName: string;
  phone: string;
  productsIntro?: string;
  status?: string;
};

export type TicketNewPayload = {
  id: string;
  subject: string;
  customerName?: string;
  customerPhone?: string;
};

export type InventoryOutPayload = {
  orderId: string;
  productNames: string[];
};

export type DigestPayload = {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  ordersToday?: number;
  pendingOrders: number;
  openTickets: number;
  unreadMessages: number;
  lowStockCount: number;
  customersCount: number;
  avgOrderValue: number;
};

export type CommandReplyPayload = {
  text: string;
};

type TelegramPayloadMap = {
  "order.paid": OrderPaidPayload;
  "order.status_changed": OrderStatusPayload;
  "order.cancelled": OrderStatusPayload;
  "order.refunded": OrderStatusPayload;
  "order.payment_failed": OrderPaymentFailedPayload;
  "contact.message": ContactMessagePayload;
  "newsletter.subscribe": NewsletterSubscribePayload;
  "seller.application_new": SellerApplicationPayload;
  "seller.application_status": SellerApplicationPayload;
  "ticket.new": TicketNewPayload;
  "inventory.out_of_stock": InventoryOutPayload;
  digest: DigestPayload;
  command_reply: CommandReplyPayload;
};

const STATUS_FA: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return escapeHtml(phone);
  const head = digits.slice(0, 4);
  const tail = digits.slice(-4);
  return `${head}***${tail}`;
}

export function isTelegramNotifyEnabled(): boolean {
  const flag = (process.env.TELEGRAM_NOTIFY_ENABLED ?? "")
    .trim()
    .toLowerCase();
  if (flag !== "true" && flag !== "1") return false;
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return false;
  return getTelegramAdminChatIds().length > 0;
}

export function getTelegramAdminChatIds(): string[] {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_IDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isTelegramChatAllowed(chatId: string | number): boolean {
  const id = String(chatId);
  return getTelegramAdminChatIds().includes(id);
}

function adminLink(path: string): string {
  return `${adminPublicUrl()}${hajiasalPath(path)}`;
}

function itemsSummary(order: StoredOrder): string {
  const items = order.items ?? [];
  const lines = items.slice(0, 8).map((item) => {
    const title = escapeHtml(item.title ?? "محصول");
    const qty = item.quantity ?? 1;
    const weight = item.weight?.label
      ? ` (${escapeHtml(item.weight.label)})`
      : "";
    return `• ${title}${weight} × ${qty.toLocaleString("fa-IR")}`;
  });
  if (items.length > 8) {
    lines.push(
      `• ... و ${(items.length - 8).toLocaleString("fa-IR")} مورد دیگر`,
    );
  }
  return lines.join("\n") || "• -";
}

function orderHeader(order: StoredOrder): string {
  const name = escapeHtml(order.customer?.fullName ?? "مشتری");
  const phone = maskPhone(order.customer?.phone);
  return [
    `<b>سفارش:</b> <code>${escapeHtml(order.id)}</code>`,
    `<b>مشتری:</b> ${name} · ${phone}`,
    `<b>مبلغ:</b> ${formatPrice(order.total)}`,
  ].join("\n");
}

export function buildTelegramTemplate(
  event: TelegramNotifyEvent,
  payload: unknown,
): string {
  switch (event) {
    case "order.paid": {
      const { order } = payload as OrderPaidPayload;
      const pay =
        order.paymentMethod === "snappay" ? "اسنپ‌پی" : "پرداخت آنلاین (زیبال)";
      return [
        "🛒 <b>پرداخت موفق | حاجی‌عسل</b>",
        orderHeader(order),
        `<b>روش پرداخت:</b> ${pay}`,
        `<b>اقلام:</b>\n${itemsSummary(order)}`,
        `<b>زمان:</b> ${formatJalaliDate(order.createdAt || order.updatedAt)}`,
        `<a href="${adminLink(`/admin/orders/${encodeURIComponent(order.id)}`)}">مشاهده در پنل</a>`,
      ].join("\n");
    }
    case "order.status_changed": {
      const p = payload as OrderStatusPayload;
      const prev = STATUS_FA[p.prevStatus ?? ""] ?? p.prevStatus ?? "-";
      const next = STATUS_FA[p.nextStatus ?? ""] ?? p.nextStatus ?? "-";
      const tracking = p.order.trackingCode
        ? `\n<b>رهگیری:</b> <code>${escapeHtml(p.order.trackingCode)}</code>`
        : "";
      return [
        "📦 <b>تغییر وضعیت سفارش</b>",
        orderHeader(p.order),
        `<b>وضعیت:</b> ${escapeHtml(String(prev))} → ${escapeHtml(String(next))}${tracking}`,
        `<a href="${adminLink(`/admin/orders/${encodeURIComponent(p.order.id)}`)}">مشاهده در پنل</a>`,
      ].join("\n");
    }
    case "order.cancelled": {
      const p = payload as OrderStatusPayload;
      const note = p.order.adminNote
        ? `\n<b>یادداشت:</b> ${escapeHtml(p.order.adminNote.slice(0, 200))}`
        : "";
      return [
        "⛔ <b>لغو سفارش</b>",
        orderHeader(p.order),
        note,
        `<a href="${adminLink(`/admin/orders/${encodeURIComponent(p.order.id)}`)}">مشاهده در پنل</a>`,
      ].join("\n");
    }
    case "order.refunded": {
      const p = payload as OrderStatusPayload;
      const note = p.order.refundNote
        ? `\n<b>یادداشت:</b> ${escapeHtml(p.order.refundNote.slice(0, 200))}`
        : "";
      return [
        "💸 <b>استرداد سفارش</b>",
        orderHeader(p.order),
        note,
        `<a href="${adminLink(`/admin/orders/${encodeURIComponent(p.order.id)}`)}">مشاهده در پنل</a>`,
      ].join("\n");
    }
    case "order.payment_failed": {
      const p = payload as OrderPaymentFailedPayload;
      const reason =
        p.reason === "cancelled"
          ? "انصراف کاربر"
          : p.reason === "amount_mismatch"
            ? "عدم تطابق مبلغ"
            : "ناموفق / خطا";
      const gateway = p.gateway
        ? `\n<b>درگاه:</b> ${escapeHtml(p.gateway)}`
        : "";
      return [
        "⚠️ <b>پرداخت ناموفق</b>",
        `<b>سفارش:</b> <code>${escapeHtml(p.orderId)}</code>`,
        `<b>علت:</b> ${reason}${gateway}`,
      ].join("\n");
    }
    case "contact.message": {
      const p = payload as ContactMessagePayload;
      const excerpt = escapeHtml((p.message ?? "").slice(0, 280));
      return [
        "✉️ <b>پیام تماس جدید</b>",
        `<b>از:</b> ${escapeHtml(p.name)} · ${maskPhone(p.phone)}`,
        p.email ? `<b>ایمیل:</b> ${escapeHtml(p.email)}` : "",
        `<b>موضوع:</b> ${escapeHtml(p.subject)}`,
        `<b>متن:</b>\n${excerpt}`,
        `<a href="${adminLink("/admin/messages")}">پیام‌ها در پنل</a>`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "newsletter.subscribe": {
      const p = payload as NewsletterSubscribePayload;
      return [
        "📰 <b>عضویت خبرنامه</b>",
        `<b>ایمیل:</b> ${escapeHtml(p.email)}`,
      ].join("\n");
    }
    case "seller.application_new": {
      const p = payload as SellerApplicationPayload;
      const intro = p.productsIntro
        ? `\n<b>معرفی:</b> ${escapeHtml(p.productsIntro.slice(0, 200))}`
        : "";
      return [
        "🏪 <b>درخواست فروشنده جدید</b>",
        `<b>نام:</b> ${escapeHtml(p.fullName)}`,
        `<b>موبایل:</b> ${maskPhone(p.phone)}${intro}`,
        `<a href="${adminLink(`/admin/seller-applications/${encodeURIComponent(p.id)}`)}">بررسی در پنل</a>`,
      ].join("\n");
    }
    case "seller.application_status": {
      const p = payload as SellerApplicationPayload;
      return [
        "🏪 <b>وضعیت درخواست فروشنده</b>",
        `<b>نام:</b> ${escapeHtml(p.fullName)}`,
        `<b>موبایل:</b> ${maskPhone(p.phone)}`,
        `<b>وضعیت:</b> ${escapeHtml(p.status ?? "-")}`,
        `<a href="${adminLink(`/admin/seller-applications/${encodeURIComponent(p.id)}`)}">مشاهده در پنل</a>`,
      ].join("\n");
    }
    case "ticket.new": {
      const p = payload as TicketNewPayload;
      const who = p.customerName
        ? `${escapeHtml(p.customerName)} · ${maskPhone(p.customerPhone)}`
        : p.customerPhone
          ? maskPhone(p.customerPhone)
          : "";
      return [
        "🎫 <b>تیکت پشتیبانی جدید</b>",
        `<b>شناسه:</b> <code>${escapeHtml(p.id)}</code>`,
        `<b>موضوع:</b> ${escapeHtml(p.subject)}`,
        who ? `<b>مشتری:</b> ${who}` : "",
        `<a href="${adminLink(`/admin/tickets/${encodeURIComponent(p.id)}`)}">مشاهده تیکت</a>`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "inventory.out_of_stock": {
      const p = payload as InventoryOutPayload;
      const names = (p.productNames ?? [])
        .slice(0, 10)
        .map((n) => `• ${escapeHtml(n)}`)
        .join("\n");
      return [
        "📉 <b>کمبود موجودی پس از فروش</b>",
        `<b>سفارش:</b> <code>${escapeHtml(p.orderId)}</code>`,
        names || "• -",
        `<a href="${adminLink("/admin/inventory")}">انبار</a>`,
      ].join("\n");
    }
    case "digest": {
      const p = payload as DigestPayload;
      return [
        "📊 <b>گزارش روزانه حاجی‌عسل</b>",
        `<b>فروش امروز:</b> ${formatPrice(p.salesToday)}`,
        `<b>فروش هفته:</b> ${formatPrice(p.salesWeek)}`,
        `<b>فروش ماه:</b> ${formatPrice(p.salesMonth)}`,
        `<b>میانگین سبد:</b> ${formatPrice(p.avgOrderValue)}`,
        `<b>سفارش‌های باز:</b> ${p.pendingOrders.toLocaleString("fa-IR")}`,
        `<b>تیکت باز:</b> ${p.openTickets.toLocaleString("fa-IR")}`,
        `<b>پیام نخوانده:</b> ${p.unreadMessages.toLocaleString("fa-IR")}`,
        `<b>کم‌موجود:</b> ${p.lowStockCount.toLocaleString("fa-IR")}`,
        `<b>مشتریان:</b> ${p.customersCount.toLocaleString("fa-IR")}`,
        `<a href="${adminLink("/admin/dashboard")}">داشبورد</a>`,
      ].join("\n");
    }
    case "command_reply": {
      const p = payload as CommandReplyPayload;
      return p.text;
    }
    default: {
      const _exhaustive: never = event;
      return String(_exhaustive);
    }
  }
}

const TELEGRAM_TEXT_LIMIT = 4000;
const TELEGRAM_FETCH_TIMEOUT_MS = 12_000;

/** Bot API base (Cloudflare Worker proxy recommended in Iran). */
export function getTelegramApiBaseUrl(): string {
  const raw = (
    process.env.TELEGRAM_API_BASE_URL ||
    "https://api.telegram.org"
  ).trim();
  return raw.replace(/\/$/, "") || "https://api.telegram.org";
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

async function telegramFetch(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTelegramMessage(
  text: string,
  options?: {
    parseMode?: "HTML" | "MarkdownV2";
    chatIds?: string[];
  },
): Promise<TelegramNotifyResult> {
  if (!isTelegramNotifyEnabled()) {
    return { sent: false, skipped: "disabled" };
  }
  const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
  const chatIds = options?.chatIds?.length
    ? options.chatIds
    : getTelegramAdminChatIds();
  if (chatIds.length === 0) {
    return { sent: false, skipped: "no_chat_ids" };
  }

  const parseMode = options?.parseMode ?? "HTML";
  const bodyText =
    text.length > TELEGRAM_TEXT_LIMIT
      ? `${text.slice(0, TELEGRAM_TEXT_LIMIT - 20)}\n...`
      : text;
  let anyOk = false;
  let lastError: string | undefined;
  const endpoint = telegramBotUrl(token, "sendMessage");

  for (const chatId of chatIds) {
    try {
      const res = await telegramFetch(endpoint, {
        method: "POST",
        headers: telegramProxyHeaders(),
        body: JSON.stringify({
          chat_id: chatId,
          text: bodyText,
          parse_mode: parseMode,
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        lastError = `HTTP ${res.status}: ${body.slice(0, 200)}`;
        console.error("[telegram-notify] send failed", chatId, lastError);
        continue;
      }
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        description?: string;
      } | null;
      if (json && json.ok === false) {
        lastError = json.description ?? "telegram_api_error";
        console.error("[telegram-notify] api error", chatId, lastError);
        continue;
      }
      anyOk = true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error("[telegram-notify] fetch error", chatId, lastError);
    }
  }

  if (!anyOk) {
    return { sent: false, error: lastError ?? "send_failed" };
  }
  return { sent: true };
}

/** Safe ping to admin chats only (no customer impact). */
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

/**
 * Soft-fail notify: never throws; logs on failure.
 * Disabled unless TELEGRAM_NOTIFY_ENABLED=true + token + chat IDs.
 */
export async function notifyTelegram<E extends TelegramNotifyEvent>(
  event: E,
  payload: TelegramPayloadMap[E],
): Promise<TelegramNotifyResult> {
  try {
    if (!isTelegramNotifyEnabled()) {
      return { sent: false, skipped: "disabled" };
    }
    const text = buildTelegramTemplate(event, payload);
    return await sendTelegramMessage(text);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[telegram-notify]", event, msg);
    return { sent: false, error: msg };
  }
}

/** Reply to a single chat (bot commands). Soft-fail. */
export async function replyTelegramChat(
  chatId: string | number,
  text: string,
): Promise<TelegramNotifyResult> {
  try {
    if (!isTelegramNotifyEnabled()) {
      return { sent: false, skipped: "disabled" };
    }
    if (!isTelegramChatAllowed(chatId)) {
      return { sent: false, skipped: "chat_not_allowed" };
    }
    return await sendTelegramMessage(text, { chatIds: [String(chatId)] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[telegram-notify] reply", msg);
    return { sent: false, error: msg };
  }
}

/** @internal */
export const __telegramNotifyTestUtils = {
  buildTelegramTemplate,
  escapeHtml,
  maskPhone,
  isTelegramNotifyEnabled,
  getTelegramAdminChatIds,
};

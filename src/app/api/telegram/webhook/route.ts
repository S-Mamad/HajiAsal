import { NextResponse } from "next/server";
import { getAppRole } from "@/lib/server/app-role";
import { getDashboardStats } from "@/lib/server/admin-platform-store";
import { getAllOrders } from "@/lib/server/orders";
import { countOpenUnifiedTickets } from "@/lib/server/unified-tickets";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { formatPrice } from "@/lib/utils";
import {
  escapeHtml,
  isTelegramChatAllowed,
  isTelegramNotifyEnabled,
  replyTelegramChat,
} from "@/lib/server/telegram-notify";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
};

function webhookAllowedOnThisApp(): boolean {
  const role = getAppRole();
  return role === "admin" || role === "all";
}

function verifySecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  return header === expected;
}

/** Normalize `/start@MyBot` → `/start` */
function parseCommand(text: string): string {
  const raw = (text.split(/\s+/)[0] ?? "").toLowerCase();
  return raw.replace(/@[\w_]+$/, "");
}

function tehranDateKey(isoOrNow?: string): string {
  const d = isoOrNow ? new Date(isoOrNow) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function helpText(): string {
  return [
    "🍯 <b>ربات اعلان حاجی‌عسل</b>",
    "",
    "دستورات:",
    "/today - فروش و آمار امروز",
    "/stats - خلاصه هفته/ماه و صف‌ها",
    "/orders - ۵ سفارش اخیر",
    "/help - همین راهنما",
  ].join("\n");
}

async function handleCommand(chatId: string, command: string): Promise<void> {
  const cmd = parseCommand(command);

  if (cmd === "/start" || cmd === "/help") {
    await replyTelegramChat(chatId, helpText());
    return;
  }

  if (cmd === "/today") {
    const stats = await getDashboardStats().catch(() => null);
    const orders = await getAllOrders().catch(() => []);
    const todayKey = tehranDateKey();
    const ordersToday = orders.filter(
      (o) => tehranDateKey(o.createdAt) === todayKey,
    ).length;
    const text = [
      "📅 <b>آمار امروز</b>",
      `<b>فروش:</b> ${formatPrice(stats?.salesToday ?? 0)}`,
      `<b>تعداد سفارش:</b> ${ordersToday.toLocaleString("fa-IR")}`,
      `<b>مشتریان (کل):</b> ${(stats?.customersCount ?? 0).toLocaleString("fa-IR")}`,
      `<b>کم‌موجود:</b> ${(stats?.lowStockCount ?? 0).toLocaleString("fa-IR")}`,
    ].join("\n");
    await replyTelegramChat(chatId, text);
    return;
  }

  if (cmd === "/stats") {
    const stats = await getDashboardStats().catch(() => null);
    const orders = await getAllOrders().catch(() => []);
    const pending = orders.filter(
      (o) => o.status === "pending_payment" || o.status === "confirmed",
    ).length;
    const openTickets = await countOpenUnifiedTickets().catch(() => 0);
    const messages = await getContactMessagesBySource("hajiasal").catch(
      () => [],
    );
    const unread = messages.filter((m) => !m.readAt).length;
    const text = [
      "📊 <b>خلاصه آمار</b>",
      `<b>فروش هفته:</b> ${formatPrice(stats?.salesWeek ?? 0)}`,
      `<b>فروش ماه:</b> ${formatPrice(stats?.salesMonth ?? 0)}`,
      `<b>میانگین سبد:</b> ${formatPrice(stats?.avgOrderValue ?? 0)}`,
      `<b>سفارش‌های باز:</b> ${pending.toLocaleString("fa-IR")}`,
      `<b>تیکت باز:</b> ${openTickets.toLocaleString("fa-IR")}`,
      `<b>پیام نخوانده:</b> ${unread.toLocaleString("fa-IR")}`,
      `<b>کم‌موجود:</b> ${(stats?.lowStockCount ?? 0).toLocaleString("fa-IR")}`,
    ].join("\n");
    await replyTelegramChat(chatId, text);
    return;
  }

  if (cmd === "/orders") {
    const orders = await getAllOrders().catch(() => []);
    const recent = orders.slice(0, 5);
    if (recent.length === 0) {
      await replyTelegramChat(chatId, "سفارشی ثبت نشده است.");
      return;
    }
    const lines = recent.map((o) => {
      const name = escapeHtml(o.customer?.fullName ?? "-");
      return `• <code>${escapeHtml(o.id)}</code> · ${escapeHtml(o.status)} · ${formatPrice(o.total)} · ${name}`;
    });
    await replyTelegramChat(
      chatId,
      ["🧾 <b>۵ سفارش اخیر</b>", ...lines].join("\n"),
    );
    return;
  }

  await replyTelegramChat(chatId, "دستور ناشناخته. /help را بفرستید.");
}

export async function POST(request: Request) {
  if (!webhookAllowedOnThisApp()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTelegramNotifyEnabled()) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? "").trim();
  if (chatId == null || !text) {
    return NextResponse.json({ ok: true });
  }

  if (!isTelegramChatAllowed(chatId)) {
    return NextResponse.json({ ok: true, ignored: "chat" });
  }

  const rl = await checkRateLimitAsync(
    `telegram-cmd:${chatId}`,
    20,
    60 * 1000,
  );
  if (!rl.ok) {
    await replyTelegramChat(
      chatId,
      "محدودیت نرخ: کمی صبر کنید و دوباره تلاش کنید.",
    );
    return NextResponse.json({ ok: true, rateLimited: true });
  }

  if (text.startsWith("/")) {
    await handleCommand(String(chatId), text);
  }

  return NextResponse.json({ ok: true });
}

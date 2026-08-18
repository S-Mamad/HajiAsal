import { getDashboardStats } from "../admin-platform-store";
import { getAllOrders, getOrderById } from "../orders";
import { countOpenUnifiedTickets } from "../unified-tickets";
import { getContactMessagesBySource } from "../newsletter";
import { checkRateLimitAsync } from "../rate-limit";
import { formatPrice } from "@/lib/utils";
import { normalizePhone } from "@/lib/auth/phone";
import { getOrderPaymentBinding } from "../payment-refs";
import { isMysqlConfigured, mysqlQuery } from "../mysql";
import type { RowDataPacket } from "mysql2/promise";
import {
  isTelegramBotConfigured,
  isTelegramNotifyEnabled,
} from "./config";
import { escapeHtml, maskPhone, buildTelegramTemplate } from "./format";
import { replyTelegramChat } from "./client";
import {
  statsFromStoredOrders,
  tehranDateKey,
  FRESH_PENDING_MS,
} from "../telegram-sales-stats";
import { loadTelegramDigestBundle } from "../telegram-digest";
import { countTelegramDlq, countTelegramOutboxPending } from "./outbox";

const STATUS_FA: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export function parseTelegramCommand(text: string): {
  cmd: string;
  args: string;
} {
  const parts = text.trim().split(/\s+/);
  const raw = (parts[0] ?? "").toLowerCase();
  const cmd = raw.replace(/@[\w_]+$/, "");
  const args = parts.slice(1).join(" ").trim();
  return { cmd, args };
}

function helpText(): string {
  return [
    "🍯 <b>ربات اعلان حاجی‌عسل</b>",
    "",
    "<b>آمار</b>",
    "/today - فروش و آمار امروز (تقویم تهران)",
    "/digest - گزارش روزانه کامل (همین الان)",
    "/stats - خلاصه هفته/ماه و صف‌ها",
    "/orders - ۵ سفارش اخیر",
    "/pending - سفارش‌های در انتظار پرداخت (تازه + کهنه)",
    "/failed - پرداخت‌های ناموفق / لغو / کهنه",
    "/lowstock - محصولات کم‌موجود",
    "",
    "<b>جستجو</b>",
    "/order &lt;id&gt; - جزئیات یک سفارش",
    "/search &lt;phone|orderId&gt; - جستجوی محدود",
    "",
    "<b>الرت‌ها</b>",
    "/ping - آیا ربات آنلاین است؟",
    "/alerts - وضعیت اعلان‌ها و صف",
    "",
    "ورود کد تخفیف و فعال شدن کوپن روی سفارش فوری می‌آید.",
    "گزارش روزانه خودکار یک‌بار در روز تقویم تهران می‌آید.",
    "آپدیت پروداکشن بعد از دیپلوی خودکار به تلگرام می‌آید.",
    "/help - همین راهنما",
  ].join("\n");
}

export async function handleTelegramCommand(
  chatId: string,
  commandText: string,
): Promise<void> {
  const { cmd, args } = parseTelegramCommand(commandText);

  if (cmd === "/start" || cmd === "/help") {
    await replyTelegramChat(chatId, helpText());
    return;
  }

  if (cmd === "/ping") {
    const when = new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());
    await replyTelegramChat(
      chatId,
      [
        "✅ <b>ربات آنلاین است</b>",
        `<b>زمان تهران:</b> ${escapeHtml(when)}`,
        `<b>اعلان رویدادها:</b> ${isTelegramNotifyEnabled() ? "فعال" : "خاموش (دستورات کار می‌کنند)"}`,
      ].join("\n"),
    );
    return;
  }

  if (cmd === "/today") {
    const orders = await getAllOrders().catch(() => []);
    const dash = await getDashboardStats().catch(() => ({
      customersCount: 0,
      lowStockCount: 0,
    }));
    const sales = statsFromStoredOrders(orders, {
      customersCount: dash.customersCount,
      lowStockCount: dash.lowStockCount,
    });
    const text = [
      "📅 <b>آمار امروز (تهران)</b>",
      `<b>فروش:</b> ${formatPrice(sales.salesToday)}`,
      `<b>سفارش پرداخت‌شده:</b> ${sales.ordersToday.toLocaleString("fa-IR")}`,
      `<b>میانگین سبد امروز:</b> ${formatPrice(sales.avgOrderValueToday)}`,
      `<b>دیروز:</b> ${formatPrice(sales.salesYesterday)} · ${sales.ordersYesterday.toLocaleString("fa-IR")} سفارش`,
      `<b>زیبال:</b> ${formatPrice(sales.salesZibalToday)}`,
      `<b>اسنپ‌پی:</b> ${formatPrice(sales.salesSnappayToday)}`,
      `<b>در انتظار (۲۴س):</b> ${sales.pendingOrdersFresh.toLocaleString("fa-IR")}`,
      sales.pendingOrdersStale > 0
        ? `<b>در انتظار کهنه:</b> ${sales.pendingOrdersStale.toLocaleString("fa-IR")}`
        : "",
      `<b>مشتریان ثبت‌نام‌شده:</b> ${(sales.customersCount ?? 0).toLocaleString("fa-IR")}`,
      `<b>کم‌موجود:</b> ${(sales.lowStockCount ?? 0).toLocaleString("fa-IR")}`,
    ]
      .filter(Boolean)
      .join("\n");
    await replyTelegramChat(chatId, text);
    return;
  }

  if (cmd === "/digest") {
    const { payload } = await loadTelegramDigestBundle();
    const text = buildTelegramTemplate("digest", payload);
    await replyTelegramChat(chatId, text);
    return;
  }

  if (cmd === "/stats") {
    const orders = await getAllOrders().catch(() => []);
    const dash = await getDashboardStats().catch(() => ({
      customersCount: 0,
      lowStockCount: 0,
    }));
    const sales = statsFromStoredOrders(orders, {
      customersCount: dash.customersCount,
      lowStockCount: dash.lowStockCount,
    });
    const openTickets = await countOpenUnifiedTickets().catch(() => 0);
    const messages = await getContactMessagesBySource("hajiasal").catch(
      () => [],
    );
    const unread = messages.filter((m) => !m.readAt).length;
    const text = [
      "📊 <b>خلاصه آمار</b>",
      `<b>فروش ۷روز:</b> ${formatPrice(sales.salesWeek)} · ${sales.ordersWeek.toLocaleString("fa-IR")} سفارش`,
      `<b>فروش ماه:</b> ${formatPrice(sales.salesMonth)} · ${sales.ordersMonth.toLocaleString("fa-IR")} سفارش`,
      `<b>میانگین سبد هفته:</b> ${formatPrice(sales.avgOrderValueWeek)}`,
      `<b>میانگین سبد کل:</b> ${formatPrice(sales.avgOrderValue)}`,
      `<b>در انتظار (۲۴س):</b> ${sales.pendingOrdersFresh.toLocaleString("fa-IR")}`,
      sales.pendingOrdersStale > 0
        ? `<b>در انتظار کهنه:</b> ${sales.pendingOrdersStale.toLocaleString("fa-IR")}`
        : "",
      `<b>تیکت باز:</b> ${openTickets.toLocaleString("fa-IR")}`,
      `<b>پیام نخوانده:</b> ${unread.toLocaleString("fa-IR")}`,
      `<b>کم‌موجود:</b> ${(sales.lowStockCount ?? 0).toLocaleString("fa-IR")}`,
    ]
      .filter(Boolean)
      .join("\n");
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
      const st = STATUS_FA[o.status] ?? o.status;
      return `• <code>${escapeHtml(o.id)}</code> · ${escapeHtml(st)} · ${formatPrice(o.total)} · ${name}`;
    });
    await replyTelegramChat(
      chatId,
      ["🧾 <b>۵ سفارش اخیر</b>", ...lines].join("\n"),
    );
    return;
  }

  if (cmd === "/pending") {
    const orders = await getAllOrders().catch(() => []);
    const now = Date.now();
    const pending = orders.filter((o) => o.status === "pending_payment");
    if (pending.length === 0) {
      await replyTelegramChat(chatId, "سفارش در انتظار پرداختی نیست.");
      return;
    }
    const fresh = pending.filter(
      (o) => now - new Date(o.createdAt).getTime() <= FRESH_PENDING_MS,
    );
    const stale = pending.filter(
      (o) => now - new Date(o.createdAt).getTime() > FRESH_PENDING_MS,
    );
    const fmt = (list: typeof pending) =>
      list.slice(0, 8).map((o) => {
        return `• <code>${escapeHtml(o.id)}</code> · ${formatPrice(o.total)} · ${maskPhone(o.customer?.phone)} · ${escapeHtml(tehranDateKey(o.createdAt))}`;
      });
    await replyTelegramChat(
      chatId,
      [
        "⏳ <b>در انتظار پرداخت</b>",
        `<b>تازه (۲۴س):</b> ${fresh.length.toLocaleString("fa-IR")} · <b>کهنه:</b> ${stale.length.toLocaleString("fa-IR")}`,
        fresh.length ? "<b>تازه</b>" : "",
        ...fmt(fresh),
        stale.length ? "<b>کهنه</b>" : "",
        ...fmt(stale),
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return;
  }

  if (cmd === "/failed") {
    const orders = await getAllOrders().catch(() => []);
    const now = Date.now();
    const recentMs = 7 * 24 * 60 * 60 * 1000;
    const failed = orders
      .filter((o) => {
        const age = now - new Date(o.createdAt).getTime();
        if (!Number.isFinite(age) || age > recentMs) return false;
        return (
          o.status === "cancelled" ||
          Boolean(o.refundedAt) ||
          (o.status === "pending_payment" && age > 60 * 60 * 1000)
        );
      })
      .slice(0, 10);
    if (failed.length === 0) {
      await replyTelegramChat(
        chatId,
        "مورد مشکوک/ناموفقی در ۷ روز اخیر نیست.",
      );
      return;
    }
    const lines = failed.map((o) => {
      const st = STATUS_FA[o.status] ?? o.status;
      return `• <code>${escapeHtml(o.id)}</code> · ${escapeHtml(st)} · ${formatPrice(o.total)} · ${escapeHtml(tehranDateKey(o.createdAt))}`;
    });
    await replyTelegramChat(
      chatId,
      ["⚠️ <b>ناموفق / لغو / کهنه (۷روز)</b>", ...lines].join("\n"),
    );
    return;
  }

  if (cmd === "/lowstock") {
    let low: Array<{ title: string; stock_qty: number; min_stock: number }> =
      [];
    if (isMysqlConfigured()) {
      try {
        const rows = await mysqlQuery<RowDataPacket>(
          `SELECT title, stock_qty, min_stock FROM products
           WHERE stock_qty <= min_stock AND min_stock > 0
           ORDER BY stock_qty ASC LIMIT 15`,
        );
        low = rows.map((p) => ({
          title: String(p.title ?? "-"),
          stock_qty: Number(p.stock_qty ?? 0),
          min_stock: Number(p.min_stock ?? 0),
        }));
      } catch {
        low = [];
      }
    }
    if (low.length === 0) {
      const dash = await getDashboardStats().catch(() => ({
        lowStockCount: 0,
      }));
      await replyTelegramChat(
        chatId,
        dash.lowStockCount
          ? `📉 ${dash.lowStockCount.toLocaleString("fa-IR")} مورد کم‌موجود (جزئیات در پنل انبار).`
          : "محصول کم‌موجودی ثبت نشده است.",
      );
      return;
    }
    const lines = low.map((p) => {
      return `• ${escapeHtml(p.title)} · موجودی ${p.stock_qty.toLocaleString("fa-IR")} / حداقل ${p.min_stock.toLocaleString("fa-IR")}`;
    });
    await replyTelegramChat(
      chatId,
      ["📉 <b>کم‌موجود</b>", ...lines].join("\n"),
    );
    return;
  }

  if (cmd === "/order") {
    if (!args) {
      await replyTelegramChat(chatId, "مثال: <code>/order HA-xxx</code>");
      return;
    }
    const order = await getOrderById(args).catch(() => null);
    if (!order) {
      await replyTelegramChat(chatId, "سفارش یافت نشد.");
      return;
    }
    const binding = await getOrderPaymentBinding(order.id).catch(() => null);
    const st = STATUS_FA[order.status] ?? order.status;
    const pay =
      order.paymentMethod === "snappay" ? "اسنپ‌پی" : "زیبال / آنلاین";
    const text = [
      "🧾 <b>جزئیات سفارش</b>",
      `<b>شناسه:</b> <code>${escapeHtml(order.id)}</code>`,
      `<b>وضعیت:</b> ${escapeHtml(st)}`,
      `<b>مبلغ:</b> ${formatPrice(order.total)}`,
      `<b>روش:</b> ${pay}`,
      `<b>مشتری:</b> ${escapeHtml(order.customer?.fullName ?? "-")} · ${maskPhone(order.customer?.phone)}`,
      order.couponCode
        ? `<b>کوپن:</b> <code>${escapeHtml(order.couponCode)}</code>`
        : "",
      binding
        ? `<b>مرجع درگاه:</b> <code>${escapeHtml((binding.paymentRef || "-").slice(0, 40))}</code>`
        : "",
      `<b>تاریخ:</b> ${escapeHtml(tehranDateKey(order.createdAt))}`,
    ]
      .filter(Boolean)
      .join("\n");
    await replyTelegramChat(chatId, text);
    return;
  }

  if (cmd === "/search") {
    const searchRl = await checkRateLimitAsync(
      `telegram-search:${chatId}`,
      8,
      60 * 1000,
    );
    if (!searchRl.ok) {
      await replyTelegramChat(
        chatId,
        "محدودیت جستجو: کمی صبر کنید و دوباره تلاش کنید.",
      );
      return;
    }
    if (!args) {
      await replyTelegramChat(
        chatId,
        "مثال: <code>/search 0912...</code> یا <code>/search HA-xxx</code>",
      );
      return;
    }

    const maybeOrder = await getOrderById(args).catch(() => null);
    if (maybeOrder) {
      await handleTelegramCommand(chatId, `/order ${maybeOrder.id}`);
      return;
    }

    const phone = normalizePhone(args);
    if (!phone) {
      await replyTelegramChat(chatId, "ورودی جستجو نامعتبر است.");
      return;
    }
    const orders = await getAllOrders().catch(() => []);
    const matches = orders
      .filter((o) => normalizePhone(o.customer?.phone) === phone)
      .slice(0, 8);
    if (matches.length === 0) {
      await replyTelegramChat(
        chatId,
        `نتیجه‌ای برای ${maskPhone(phone)} یافت نشد.`,
      );
      return;
    }
    const lines = matches.map((o) => {
      const st = STATUS_FA[o.status] ?? o.status;
      return `• <code>${escapeHtml(o.id)}</code> · ${escapeHtml(st)} · ${formatPrice(o.total)}`;
    });
    await replyTelegramChat(
      chatId,
      [`🔎 <b>نتایج برای ${maskPhone(phone)}</b>`, ...lines].join("\n"),
    );
    return;
  }

  if (cmd === "/alerts") {
    const enabled = isTelegramNotifyEnabled();
    const botOk = isTelegramBotConfigured();
    const pending = await countTelegramOutboxPending().catch(() => 0);
    const dlq = await countTelegramDlq().catch(() => 0);
    const text = [
      "🔔 <b>وضعیت الرت‌ها</b>",
      `<b>ربات (دستورات):</b> ${botOk ? "آماده" : "ناقص (توکن/چت)"}`,
      `<b>اعلان رویدادها:</b> ${enabled ? "فعال" : "خاموش — TELEGRAM_NOTIFY_ENABLED"}`,
      "<b>فوری:</b> درخواست کد، ورود، پرداخت، کوپن، سفارش، تیکت، نظر، خطا",
      `<b>صف در انتظار:</b> ${pending.toLocaleString("fa-IR")}`,
      `<b>ناموفق ماندگار (DLQ):</b> ${dlq.toLocaleString("fa-IR")}`,
      "",
      "فروشگاه رویداد را در MySQL می‌نویسد؛ ورکر ادمین ارسال می‌کند.",
    ].join("\n");
    await replyTelegramChat(chatId, text);
    return;
  }

  await replyTelegramChat(chatId, "دستور ناشناخته. /help را بفرستید.");
}

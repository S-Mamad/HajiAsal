import { formatJalaliDate, formatPrice } from "@/lib/utils";
import { adminPublicUrl, hajiasalPath } from "@/lib/paths";
import type { StoredOrder } from "../orders";
import { serializeOrderCallback } from "./callbacks";
import type {
  ApiErrorCriticalPayload,
  AuthNotifyPayload,
  CommandReplyPayload,
  ContactMessagePayload,
  CouponNotifyPayload,
  DeployUpdatePayload,
  DigestPayload,
  InventoryOutPayload,
  NewsletterSubscribePayload,
  OrderCreatedPayload,
  OrderPaidPayload,
  OrderPaymentFailedPayload,
  OrderStatusPayload,
  PaymentGatewayPayload,
  ReviewCreatedPayload,
  SellerApplicationPayload,
  TelegramNotifyEvent,
  TicketNewPayload,
  TicketReplyPayload,
} from "./events";

const STATUS_FA: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

export type TelegramInlineButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };

export type TelegramReplyMarkup = {
  inline_keyboard: TelegramInlineButton[][];
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

export function telegramAdminLink(path: string): string {
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

function paymentGatewayLine(p: PaymentGatewayPayload): string[] {
  return [
    `<b>سفارش:</b> <code>${escapeHtml(p.orderId)}</code>`,
    `<b>درگاه:</b> ${escapeHtml(p.gateway)}`,
    p.amountToman != null ? `<b>مبلغ:</b> ${formatPrice(p.amountToman)}` : "",
    p.paymentRef
      ? `<b>مرجع:</b> <code>${escapeHtml(p.paymentRef.slice(0, 48))}</code>`
      : "",
    p.reason ? `<b>علت:</b> ${escapeHtml(p.reason)}` : "",
  ].filter(Boolean);
}

export function orderPanelUrl(orderId: string): string {
  return telegramAdminLink(`/admin/orders/${encodeURIComponent(orderId)}`);
}

export function ticketPanelUrl(ticketId: string): string {
  return telegramAdminLink(`/admin/tickets/${encodeURIComponent(ticketId)}`);
}

export function buildOrderReplyMarkup(
  order: StoredOrder,
): TelegramReplyMarkup {
  const rows: TelegramInlineButton[][] = [
    [{ text: "مشاهده در پنل", url: orderPanelUrl(order.id) }],
  ];
  if (order.status === "pending_payment") {
    rows.push([
      {
        text: "لغو سفارش",
        callback_data: serializeOrderCallback("cancel", order.id),
      },
    ]);
  } else if (order.status === "confirmed") {
    rows.push([
      {
        text: "آماده‌سازی",
        callback_data: serializeOrderCallback("processing", order.id),
      },
    ]);
  }
  return { inline_keyboard: rows };
}

export function buildTicketReplyMarkup(ticketId: string): TelegramReplyMarkup {
  return {
    inline_keyboard: [
      [{ text: "مشاهده تیکت", url: ticketPanelUrl(ticketId) }],
    ],
  };
}

export function buildOrderCreatedBatchTemplate(orders: StoredOrder[]): string {
  const lines = orders.slice(0, 12).map((order) => {
    return `• <code>${escapeHtml(order.id)}</code> · ${formatPrice(order.total)} · ${maskPhone(order.customer?.phone)}`;
  });
  if (orders.length > 12) {
    lines.push(
      `• ... و ${(orders.length - 12).toLocaleString("fa-IR")} سفارش دیگر`,
    );
  }
  return [
    `📝 <b>${orders.length.toLocaleString("fa-IR")} سفارش جدید (در انتظار پرداخت)</b>`,
    ...lines,
    `<a href="${telegramAdminLink("/admin/orders")}">سفارش‌ها در پنل</a>`,
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
        `<a href="${orderPanelUrl(order.id)}">مشاهده در پنل</a>`,
      ].join("\n");
    }
    case "order.created": {
      const { order } = payload as OrderCreatedPayload;
      const pay =
        order.paymentMethod === "snappay" ? "اسنپ‌پی" : "پرداخت آنلاین (زیبال)";
      const coupon = order.couponCode
        ? `\n<b>کوپن:</b> <code>${escapeHtml(order.couponCode)}</code>`
        : "";
      return [
        "📝 <b>سفارش جدید (در انتظار پرداخت)</b>",
        orderHeader(order),
        `<b>روش:</b> ${pay}${coupon}`,
        `<b>اقلام:</b>\n${itemsSummary(order)}`,
        `<a href="${orderPanelUrl(order.id)}">مشاهده در پنل</a>`,
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
        `<a href="${orderPanelUrl(p.order.id)}">مشاهده در پنل</a>`,
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
        `<a href="${orderPanelUrl(p.order.id)}">مشاهده در پنل</a>`,
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
        `<a href="${orderPanelUrl(p.order.id)}">مشاهده در پنل</a>`,
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
    case "payment.create": {
      const p = payload as PaymentGatewayPayload;
      return ["💳 <b>ساخت درگاه پرداخت</b>", ...paymentGatewayLine(p)].join(
        "\n",
      );
    }
    case "payment.reuse": {
      const p = payload as PaymentGatewayPayload;
      return [
        "♻️ <b>بازنشانی به درگاه قبلی</b>",
        ...paymentGatewayLine(p),
      ].join("\n");
    }
    case "payment.spam_blocked": {
      const p = payload as PaymentGatewayPayload;
      return [
        "🛡️ <b>مسدودسازی اسپم درگاه</b>",
        ...paymentGatewayLine(p),
      ].join("\n");
    }
    case "auth.login": {
      const p = payload as AuthNotifyPayload;
      return [
        "👤 <b>ورود موفق (کد تأیید درست بود)</b>",
        `<b>موبایل:</b> ${maskPhone(p.phone)}`,
        p.fullName ? `<b>نام:</b> ${escapeHtml(p.fullName)}` : "",
        p.userId
          ? `<b>شناسه:</b> <code>${escapeHtml(p.userId)}</code>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "auth.register": {
      const p = payload as AuthNotifyPayload;
      return [
        "🆕 <b>ثبت‌نام / کاربر جدید</b>",
        `<b>موبایل:</b> ${maskPhone(p.phone)}`,
        p.userId
          ? `<b>شناسه:</b> <code>${escapeHtml(p.userId)}</code>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "auth.otp_requested": {
      const p = payload as AuthNotifyPayload;
      return [
        "📲 <b>درخواست کد ورود (SMS)</b>",
        `<b>موبایل:</b> ${maskPhone(p.phone)}`,
        "<i>هنوز وارد نشده — فقط کد صادر شده</i>",
      ].join("\n");
    }
    case "coupon.applied": {
      const p = payload as CouponNotifyPayload;
      const title =
        p.source === "checkout"
          ? "کوپن روی سفارش فعال شد"
          : "کد تخفیف وارد شد";
      return [
        `🏷️ <b>${title}</b>`,
        `<b>کد:</b> <code>${escapeHtml(p.code)}</code>`,
        p.discount != null ? `<b>تخفیف:</b> ${formatPrice(p.discount)}` : "",
        p.subtotal != null ? `<b>سبد:</b> ${formatPrice(p.subtotal)}` : "",
        p.phone ? `<b>موبایل:</b> ${maskPhone(p.phone)}` : "",
        p.orderId
          ? `<b>سفارش:</b> <code>${escapeHtml(p.orderId)}</code>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "coupon.rejected": {
      const p = payload as CouponNotifyPayload;
      const title =
        p.source === "checkout" ? "کوپن سفارش رد شد" : "کد تخفیف رد شد";
      return [
        `🏷️ <b>${title}</b>`,
        `<b>کد:</b> <code>${escapeHtml(p.code)}</code>`,
        p.message ? `<b>پیام:</b> ${escapeHtml(p.message.slice(0, 160))}` : "",
        p.subtotal != null ? `<b>سبد:</b> ${formatPrice(p.subtotal)}` : "",
        p.phone ? `<b>موبایل:</b> ${maskPhone(p.phone)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "api.error_critical": {
      const p = payload as ApiErrorCriticalPayload;
      return [
        "🚨 <b>خطای حیاتی سرور</b>",
        `<b>مسیر:</b> <code>${escapeHtml(p.route)}</code>`,
        `<b>پیام:</b> ${escapeHtml((p.message ?? "").slice(0, 240))}`,
        p.orderId
          ? `<b>سفارش:</b> <code>${escapeHtml(p.orderId)}</code>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "deploy.update": {
      const p = payload as DeployUpdatePayload;
      const title = escapeHtml(p.title?.trim() || "آپدیت پروداکشن");
      const lines = (p.summaryLines ?? [])
        .map((l) => String(l ?? "").trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((l) => `• ${escapeHtml(l.slice(0, 200))}`);
      const when = new Intl.DateTimeFormat("fa-IR", {
        timeZone: "Asia/Tehran",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date());
      const appLabel =
        p.app === "all"
          ? "هر سه اپ (فروشگاه + ادمین + فروشنده)"
          : p.app === "storefront"
            ? "فروشگاه"
            : p.app === "admin"
              ? "ادمین"
              : p.app === "seller"
                ? "فروشنده"
                : p.app;
      return [
        `🚀 <b>${title}</b>`,
        appLabel ? `<b>اپ:</b> ${escapeHtml(String(appLabel))}` : "",
        p.version
          ? `<b>نسخه:</b> <code>${escapeHtml(p.version.slice(0, 40))}</code>`
          : "",
        `<b>زمان:</b> ${escapeHtml(when)}`,
        "",
        "<b>چه چیزی عوض شد</b>",
        lines.length > 0
          ? lines.join("\n")
          : "• آپدیت اعمال شد (جزئیات ثبت نشد)",
      ]
        .filter((line) => line !== undefined)
        .join("\n");
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
        `<a href="${telegramAdminLink("/admin/messages")}">پیام‌ها در پنل</a>`,
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
        `<a href="${telegramAdminLink(`/admin/seller-applications/${encodeURIComponent(p.id)}`)}">بررسی در پنل</a>`,
      ].join("\n");
    }
    case "seller.application_status": {
      const p = payload as SellerApplicationPayload;
      return [
        "🏪 <b>وضعیت درخواست فروشنده</b>",
        `<b>نام:</b> ${escapeHtml(p.fullName)}`,
        `<b>موبایل:</b> ${maskPhone(p.phone)}`,
        `<b>وضعیت:</b> ${escapeHtml(p.status ?? "-")}`,
        `<a href="${telegramAdminLink(`/admin/seller-applications/${encodeURIComponent(p.id)}`)}">مشاهده در پنل</a>`,
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
        p.excerpt
          ? `<b>متن:</b> ${escapeHtml(p.excerpt.slice(0, 280))}`
          : "",
        `<a href="${ticketPanelUrl(p.id)}">مشاهده تیکت</a>`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "ticket.reply": {
      const p = payload as TicketReplyPayload;
      const who = p.customerName
        ? `${escapeHtml(p.customerName)} · ${maskPhone(p.customerPhone)}`
        : p.customerPhone
          ? maskPhone(p.customerPhone)
          : "";
      return [
        "💬 <b>پاسخ جدید مشتری روی تیکت</b>",
        `<b>شناسه:</b> <code>${escapeHtml(p.id)}</code>`,
        p.subject ? `<b>موضوع:</b> ${escapeHtml(p.subject)}` : "",
        who ? `<b>مشتری:</b> ${who}` : "",
        `<b>متن:</b> ${escapeHtml((p.excerpt ?? "").slice(0, 280))}`,
        `<a href="${ticketPanelUrl(p.id)}">پاسخ در پنل</a>`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "review.created": {
      const p = payload as ReviewCreatedPayload;
      const stars = "★".repeat(Math.min(5, Math.max(1, p.rating)));
      return [
        "⭐ <b>نظر جدید خریدار</b>",
        `<b>امتیاز:</b> ${stars} (${p.rating}/5)`,
        `<b>نویسنده:</b> ${escapeHtml(p.author)}`,
        p.phone ? `<b>موبایل:</b> ${maskPhone(p.phone)}` : "",
        `<b>محصول:</b> <code>${escapeHtml(p.productId)}</code>`,
        `<b>متن:</b> ${escapeHtml((p.comment ?? "").slice(0, 280))}`,
        `<a href="${telegramAdminLink("/admin/reviews")}">نظرات در پنل</a>`,
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
        `<a href="${telegramAdminLink("/admin/inventory")}">انبار</a>`,
      ].join("\n");
    }
    case "digest": {
      const p = payload as DigestPayload;
      const todayAvg =
        p.avgOrderValueToday != null
          ? p.avgOrderValueToday
          : p.ordersToday && p.ordersToday > 0
            ? Math.round(p.salesToday / p.ordersToday)
            : 0;
      const fresh =
        p.pendingOrdersFresh != null ? p.pendingOrdersFresh : p.pendingOrders;
      const stale = p.pendingOrdersStale != null ? p.pendingOrdersStale : 0;
      const lines: Array<string | undefined> = [
        "📊 <b>گزارش روزانه حاجی‌عسل</b>",
        p.reportStamp ? `📅 ${escapeHtml(p.reportStamp)}` : undefined,
        "────────",
        `<b>فروش امروز:</b> ${formatPrice(p.salesToday)}`,
        p.ordersToday != null
          ? `<b>سفارش پرداخت‌شده امروز:</b> ${p.ordersToday.toLocaleString("fa-IR")}`
          : undefined,
        `<b>میانگین سبد امروز:</b> ${formatPrice(todayAvg)}`,
        p.salesYesterday != null
          ? `<b>دیروز:</b> ${formatPrice(p.salesYesterday)}${
              p.ordersYesterday != null
                ? ` · ${p.ordersYesterday.toLocaleString("fa-IR")} سفارش`
                : ""
            }`
          : undefined,
        `<b>زیبال امروز:</b> ${formatPrice(p.salesZibalToday ?? 0)}`,
        `<b>اسنپ‌پی امروز:</b> ${formatPrice(p.salesSnappayToday ?? 0)}`,
        "────────",
        `<b>فروش ۷روز:</b> ${formatPrice(p.salesWeek)}${
          p.ordersWeek != null
            ? ` · ${p.ordersWeek.toLocaleString("fa-IR")} سفارش`
            : ""
        }`,
        `<b>فروش ماه:</b> ${formatPrice(p.salesMonth)}${
          p.ordersMonth != null
            ? ` · ${p.ordersMonth.toLocaleString("fa-IR")} سفارش`
            : ""
        }`,
        p.avgOrderValueWeek != null
          ? `<b>میانگین سبد هفته:</b> ${formatPrice(p.avgOrderValueWeek)}`
          : undefined,
        `<b>میانگین سبد کل:</b> ${formatPrice(p.avgOrderValue)}`,
        "────────",
        `<b>در انتظار پرداخت (۲۴س اخیر):</b> ${fresh.toLocaleString("fa-IR")}`,
        stale > 0
          ? `<b>در انتظار کهنه (&gt;۲۴س):</b> ${stale.toLocaleString("fa-IR")}`
          : undefined,
        `<b>تیکت باز:</b> ${p.openTickets.toLocaleString("fa-IR")}`,
        `<b>پیام نخوانده:</b> ${p.unreadMessages.toLocaleString("fa-IR")}`,
        `<b>کم‌موجود:</b> ${p.lowStockCount.toLocaleString("fa-IR")}`,
        `<b>مشتریان ثبت‌نام‌شده:</b> ${p.customersCount.toLocaleString("fa-IR")}`,
        `<a href="${telegramAdminLink("/admin/dashboard")}">داشبورد</a>`,
      ];
      return lines.filter((line): line is string => line != null).join("\n");
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __telegramNotifyTestUtils,
  buildTelegramTemplate,
  isTelegramNotifyEnabled,
  notifyTelegram,
  replyTelegramChat,
  sendTelegramMessage,
} from "./telegram-notify";
import { __resetTelegramOutboxForTests } from "./telegram/outbox";
import type { StoredOrder } from "./orders";

const order = {
  id: "HA-TEST-1",
  status: "confirmed",
  paymentMethod: "online",
  customer: {
    fullName: "علی <تست>",
    phone: "09121234567",
    address: "تهران",
    city: "تهران",
    postalCode: "1234567890",
  },
  items: [
    {
      id: "p1",
      title: "عسل کوهی",
      quantity: 2,
      weight: { id: "w1", label: "۵۰۰ گرم", price: 100000 },
    },
  ],
  subtotal: 200000,
  shipping: 0,
  discount: 0,
  total: 200000,
  createdAt: "2026-03-20T10:00:00.000Z",
  updatedAt: "2026-03-20T10:00:00.000Z",
} as unknown as StoredOrder;

describe("telegram-notify", () => {
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.TELEGRAM_NOTIFY_ENABLED;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_ADMIN_CHAT_IDS;
    delete process.env.TELEGRAM_API_BASE_URL;
    delete process.env.TELEGRAM_PROXY_SECRET;
    delete process.env.MYSQL_HOST;
    __resetTelegramOutboxForTests();
  });

  afterEach(() => {
    process.env = { ...env };
    globalThis.fetch = originalFetch;
  });

  it("escapes HTML in user content", () => {
    const { escapeHtml } = __telegramNotifyTestUtils;
    expect(escapeHtml(`a<b>&"c`)).toBe("a&lt;b&gt;&amp;&quot;c");
  });

  it("masks phone numbers", () => {
    expect(__telegramNotifyTestUtils.maskPhone("09121234567")).toBe(
      "0912***4567",
    );
    expect(__telegramNotifyTestUtils.maskPhone("")).toBe("-");
  });

  it("isTelegramNotifyEnabled requires flag + token + chat ids", () => {
    expect(isTelegramNotifyEnabled()).toBe(false);
    process.env.TELEGRAM_NOTIFY_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "tok";
    expect(isTelegramNotifyEnabled()).toBe(false);
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "1,2";
    expect(isTelegramNotifyEnabled()).toBe(true);
  });

  it("buildTelegramTemplate for order.paid escapes name and includes amount", () => {
    const html = buildTelegramTemplate("order.paid", { order });
    expect(html).toContain("علی &lt;تست&gt;");
    expect(html).toContain("HA-TEST-1");
    expect(html).toContain("پرداخت موفق");
    expect(html).not.toContain("علی <تست>");
  });

  it("buildTelegramTemplate for contact.message truncates and escapes", () => {
    const html = buildTelegramTemplate("contact.message", {
      id: "MSG-1",
      name: "سارا",
      phone: "09121112233",
      subject: "سوال <script>",
      message: "سلام",
    });
    expect(html).toContain("سوال &lt;script&gt;");
    expect(html).toContain("0912***2233");
  });

  it("buildTelegramTemplate for payment amount mismatch", () => {
    const html = buildTelegramTemplate("order.payment_failed", {
      orderId: "HA-X",
      gateway: "zibal",
      reason: "amount_mismatch",
    });
    expect(html).toContain("عدم تطابق مبلغ");
    expect(html).toContain("zibal");
  });

  it("buildTelegramTemplate for payment.create includes toman amount", () => {
    const html = buildTelegramTemplate("payment.create", {
      orderId: "HA-X",
      gateway: "zibal",
      amountToman: 150000,
      paymentRef: "track-1",
    });
    expect(html).toContain("ساخت درگاه");
    expect(html).toContain("تومان");
  });

  it("buildTelegramTemplate for auth.login masks phone", () => {
    const html = buildTelegramTemplate("auth.login", {
      phone: "09121234567",
      fullName: "علی",
    });
    expect(html).toContain("ورود موفق");
    expect(html).toContain("0912***4567");
  });

  it("buildTelegramTemplate for auth.otp_requested", () => {
    const html = buildTelegramTemplate("auth.otp_requested", {
      phone: "09121234567",
    });
    expect(html).toContain("درخواست کد ورود");
    expect(html).toContain("هنوز وارد نشده");
  });

  it("buildTelegramTemplate for review.created", () => {
    const html = buildTelegramTemplate("review.created", {
      productId: "p1",
      author: "خریدار",
      rating: 5,
      comment: "عالی بود",
      phone: "09121234567",
    });
    expect(html).toContain("نظر جدید");
    expect(html).toContain("عالی بود");
  });

  it("buildTelegramTemplate for ticket.reply", () => {
    const html = buildTelegramTemplate("ticket.reply", {
      id: "t1",
      subject: "ارسال",
      excerpt: "کی می‌رسه؟",
      customerPhone: "09121234567",
    });
    expect(html).toContain("پاسخ جدید مشتری");
    expect(html).toContain("کی می‌رسه؟");
  });

  it("buildTelegramTemplate for coupon typed vs checkout", () => {
    const typed = buildTelegramTemplate("coupon.applied", {
      code: "HAJI10",
      valid: true,
      discount: 50_000,
      subtotal: 500_000,
      source: "typed",
      phone: "09121234567",
    });
    expect(typed).toContain("کد تخفیف وارد شد");
    expect(typed).toContain("HAJI10");
    expect(typed).toContain("0912***4567");

    const checkout = buildTelegramTemplate("coupon.applied", {
      code: "HAJI10",
      valid: true,
      discount: 50_000,
      subtotal: 500_000,
      orderId: "HA-1",
      source: "checkout",
    });
    expect(checkout).toContain("کوپن روی سفارش فعال شد");
    expect(checkout).toContain("HA-1");
  });

  it("buildTelegramTemplate for deploy.update shows Persian summary block", () => {
    const html = buildTelegramTemplate("deploy.update", {
      title: "آپدیت پروداکشن",
      app: "all",
      version: "abc1234",
      source: "test",
      summaryLines: ["حوزه‌های تغییر: بات تلگرام / اعلان‌ها", "الرت کوپن فوری"],
    });
    expect(html).toContain("آپدیت پروداکشن");
    expect(html).toContain("چه چیزی عوض شد");
    expect(html).toContain("بات تلگرام");
    expect(html).toContain("هر سه اپ");
    expect(html).toContain("abc1234");
    expect(html).not.toContain("منبع:");
  });

  it("buildTelegramTemplate for digest uses today AOV and fresh pending labels", () => {
    const html = buildTelegramTemplate("digest", {
      salesToday: 545_100,
      salesWeek: 2_125_100,
      salesMonth: 2_555_100,
      salesYesterday: 400_000,
      ordersToday: 2,
      ordersWeek: 8,
      ordersMonth: 9,
      ordersYesterday: 1,
      pendingOrders: 8,
      pendingOrdersFresh: 1,
      pendingOrdersStale: 7,
      openTickets: 2,
      unreadMessages: 0,
      lowStockCount: 0,
      customersCount: 4,
      avgOrderValue: 283_900,
      avgOrderValueToday: 272_550,
      avgOrderValueWeek: 265_000,
      salesZibalToday: 545_100,
      salesSnappayToday: 0,
      reportStamp: "پنجشنبه ۲۲ مرداد ۱۴۰۵، ۲۳:۵۵",
    });
    expect(html).toContain("گزارش روزانه");
    expect(html).toContain("میانگین سبد امروز");
    expect(html).toContain("میانگین سبد کل");
    expect(html).toContain("در انتظار پرداخت (۲۴س اخیر)");
    expect(html).toContain("در انتظار کهنه");
    expect(html).toContain("مشتریان ثبت‌نام‌شده");
    expect(html).not.toContain("سفارش‌های باز");
  });

  it("sends command replies when notify flag is off but bot is configured", async () => {
    process.env.TELEGRAM_NOTIFY_ENABLED = "false";
    process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "10";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;
    const r = await replyTelegramChat("10", "ping");
    expect(r.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("skips send when disabled", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const r = await notifyTelegram("newsletter.subscribe", {
      email: "a@b.com",
    });
    expect(r.sent).toBe(false);
    expect(r.skipped).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends to all chat ids when enabled", async () => {
    process.env.TELEGRAM_NOTIFY_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "10,20";
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock;

    const r = await sendTelegramMessage("hello");
    expect(r.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "bot123:ABC/sendMessage",
    );
  });

  it("uses TELEGRAM_API_BASE_URL for Bot API calls", async () => {
    process.env.TELEGRAM_NOTIFY_ENABLED = "true";
    process.env.TELEGRAM_BOT_TOKEN = "123:ABC";
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "10";
    process.env.TELEGRAM_API_BASE_URL =
      "https://hajiasal-telegram-proxy.example.workers.dev";
    process.env.TELEGRAM_PROXY_SECRET = "proxy-secret";

    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    globalThis.fetch = fetchMock;

    const r = await sendTelegramMessage("hello");
    expect(r.sent).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://hajiasal-telegram-proxy.example.workers.dev/bot123:ABC/sendMessage",
    );
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Telegram-Proxy-Secret"]).toBe("proxy-secret");
  });

  it("notifyTelegram order.paid uses HTML template", async () => {
    process.env.TELEGRAM_NOTIFY_ENABLED = "1";
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "99";
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        text: string;
        parse_mode: string;
      };
      expect(body.parse_mode).toBe("HTML");
      expect(body.text).toContain("پرداخت موفق");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const r = await notifyTelegram("order.paid", { order });
    expect(r.sent).toBe(true);
  });
});

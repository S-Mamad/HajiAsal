import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __telegramNotifyTestUtils,
  buildTelegramTemplate,
  isTelegramNotifyEnabled,
  notifyTelegram,
  sendTelegramMessage,
} from "./telegram-notify";
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

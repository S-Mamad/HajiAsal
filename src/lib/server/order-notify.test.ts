import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __orderNotifyTestUtils,
  isOrderSmsConfigured,
  notifyOrderStatusChange,
  sendTransactionalSms,
} from "./order-notify";
import type { StoredOrder } from "./orders";

const order = {
  id: "HA-1",
  status: "shipped",
  trackingCode: "TRK-ABC",
  customer: { phone: "09121234567" },
  paymentMethod: "online",
  items: [],
  subtotal: 1,
  shipping: 0,
  discount: 0,
  total: 1,
  createdAt: "",
  updatedAt: "",
} as unknown as StoredOrder;

describe("order-notify", () => {
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_SENDER;
    delete process.env.MELIPAYAMAK_SMS_URL;
    delete process.env.MELIPAYAMAK_SMS_TOKEN;
    delete process.env.MELIPAYAMAK_OTP_TOKEN;
  });

  afterEach(() => {
    process.env = { ...env };
    globalThis.fetch = originalFetch;
  });

  it("resolveOrderNotifyEvent maps status transitions", () => {
    const { resolveOrderNotifyEvent } = __orderNotifyTestUtils;
    expect(
      resolveOrderNotifyEvent({
        prevStatus: "pending_payment",
        nextStatus: "confirmed",
      }),
    ).toBe("confirmed");
    expect(
      resolveOrderNotifyEvent({
        prevStatus: "processing",
        nextStatus: "shipped",
        trackingCode: "T1",
      }),
    ).toBe("shipped");
    expect(
      resolveOrderNotifyEvent({ refunded: true, nextStatus: "cancelled" }),
    ).toBe("refunded");
    expect(
      resolveOrderNotifyEvent({
        prevStatus: "confirmed",
        nextStatus: "confirmed",
      }),
    ).toBeNull();
  });

  it("buildMessage includes tracking for shipped", () => {
    const msg = __orderNotifyTestUtils.buildMessage("shipped", order);
    expect(msg).toContain("TRK-ABC");
  });

  it("skips when not configured", async () => {
    expect(isOrderSmsConfigured()).toBe(false);
    const r = await notifyOrderStatusChange(order, "confirmed");
    expect(r.sent).toBe(false);
    expect(r.skipped).toBe("not_configured");
  });

  it("sends via kavenegar when configured", async () => {
    process.env.SMS_PROVIDER = "kavenegar";
    process.env.SMS_API_KEY = "key";
    process.env.SMS_SENDER = "1000";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ return: { status: 200 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const r = await sendTransactionalSms("09121234567", "hello");
    expect(r.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});

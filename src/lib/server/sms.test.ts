import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isOrderSmsEnabled,
  isTransactionalSmsConfigured,
  sendTransactionalSms,
} from "./sms";

describe("sms", () => {
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
    delete process.env.ORDER_SMS_ENABLED;
  });

  afterEach(() => {
    process.env = { ...env };
    globalThis.fetch = originalFetch;
  });

  it("order SMS is disabled by default", () => {
    expect(isOrderSmsEnabled()).toBe(false);
  });

  it("rejects empty message", async () => {
    process.env.SMS_PROVIDER = "kavenegar";
    process.env.SMS_API_KEY = "key";
    process.env.SMS_SENDER = "1000";
    const r = await sendTransactionalSms("09121234567", "   ");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("empty message");
  });

  it("sends free-text via kavenegar when configured", async () => {
    process.env.SMS_PROVIDER = "kavenegar";
    process.env.SMS_API_KEY = "key";
    process.env.SMS_SENDER = "1000";
    expect(isTransactionalSmsConfigured()).toBe(true);
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ return: { status: 200 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const r = await sendTransactionalSms("09121234567", "سلام ادمین");
    expect(r.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});

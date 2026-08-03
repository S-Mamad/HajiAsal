import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  mysqlExecute: vi.fn(),
  mysqlQueryOne: vi.fn(),
}));

vi.mock("./snappay", () => ({
  isSnappayConfigured: vi.fn(() => false),
  cancelSnappayPayment: vi.fn(),
}));

import {
  __resetPaymentRefsForTests,
  setOrderPaymentRef,
} from "./payment-refs";
import { refundOrderAtGateway, refundZarinpal } from "./payment-refund";
import type { StoredOrder } from "./orders";

const baseOrder = {
  id: "ord-1",
  status: "confirmed",
  paymentMethod: "online",
  total: 50_000,
  customer: { phone: "09120000000" },
  items: [],
  subtotal: 50_000,
  shipping: 0,
  discount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as StoredOrder;

describe("payment-refund", () => {
  const originalFetch = globalThis.fetch;
  const env = { ...process.env };

  beforeEach(() => {
    __resetPaymentRefsForTests();
    process.env = { ...env };
    delete process.env.ZARINPAL_MERCHANT_ID;
    delete process.env.ZARINPAL_ACCESS_TOKEN;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...env };
  });

  it("refundZarinpal fails closed without merchant/token", async () => {
    const r = await refundZarinpal({ authority: "A1" });
    expect(r.ok).toBe(false);
  });

  it("refundOrderAtGateway fails without payment binding", async () => {
    const r = await refundOrderAtGateway(baseOrder);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/authority|مرجع/);
  });

  it("refundOrderAtGateway rejects already refunded", async () => {
    const r = await refundOrderAtGateway({
      ...baseOrder,
      refundedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(r.ok).toBe(false);
  });

  it("refundZarinpal succeeds on gateway code 100", async () => {
    process.env.ZARINPAL_MERCHANT_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
    process.env.ZARINPAL_ACCESS_TOKEN = "tok";
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ data: { code: 100, message: "ok" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    await setOrderPaymentRef("ord-1", "zarinpal", "AUTH-1");
    const r = await refundOrderAtGateway(baseOrder);
    expect(r.ok).toBe(true);
  });

  it("refundZarinpal propagates gateway failure", async () => {
    process.env.ZARINPAL_MERCHANT_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
    process.env.ZARINPAL_ACCESS_TOKEN = "tok";
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ errors: { message: "already refunded", code: -50 } }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    await setOrderPaymentRef("ord-1", "zarinpal", "AUTH-1");
    const r = await refundOrderAtGateway(baseOrder);
    expect(r.ok).toBe(false);
  });
});

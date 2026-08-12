import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/server/orders", () => ({
  getOrderById: vi.fn(),
  confirmPaidOrder: vi.fn(),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimitAsync: vi.fn(async () => ({ ok: true })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/server/telegram-notify", () => ({
  notifyTelegram: vi.fn(),
}));

vi.mock("@/lib/server/payment-refund", () => ({
  refundOrderAtGateway: vi.fn(async () => ({ ok: true, provider: "zibal" })),
}));

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  isMysqlUsable: vi.fn(() => false),
  mysqlExecute: vi.fn(),
  mysqlQueryOne: vi.fn(),
}));

vi.mock("@/lib/server/production", () => ({
  isProduction: vi.fn(() => false),
}));

import { getSessionFromRequest } from "@/lib/auth/session";
import { confirmPaidOrder, getOrderById } from "@/lib/server/orders";
import { refundOrderAtGateway } from "@/lib/server/payment-refund";
import {
  __resetPaymentRefsForTests,
  setOrderPaymentRef,
} from "@/lib/server/payment-refs";
import { POST as createPayment } from "@/app/api/checkout/create/route";
import {
  GET as verifyGet,
  POST as verifyPost,
} from "@/app/api/checkout/verify/route";

const pendingOrder = {
  id: "ord-z1",
  status: "pending_payment",
  paymentMethod: "online",
  total: 10_000,
  trackingCode: "TRK1",
  userId: "u1",
  customer: { phone: "09121234567" },
};

describe("checkout zibal create/verify", () => {
  const originalFetch = globalThis.fetch;
  const env = { ...process.env };

  beforeEach(() => {
    __resetPaymentRefsForTests();
    process.env = { ...env };
    process.env.ZIBAL_MERCHANT = "zibal";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    vi.clearAllMocks();
    vi.mocked(getSessionFromRequest).mockReturnValue({
      userId: "u1",
      phone: "09121234567",
    } as ReturnType<typeof getSessionFromRequest>);
    vi.mocked(getOrderById).mockResolvedValue(
      pendingOrder as Awaited<ReturnType<typeof getOrderById>>,
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = { ...env };
  });

  it("create binds trackId and returns redirectUrl", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({ result: 100, trackId: 15966442233311, message: "success" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const res = await createPayment(
      new Request("http://localhost/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "ord-z1" }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.trackId).toBe("15966442233311");
    expect(data.redirectUrl).toContain("/start/15966442233311");
  });

  it("create returns 503 without merchant", async () => {
    delete process.env.ZIBAL_MERCHANT;
    const res = await createPayment(
      new Request("http://localhost/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "ord-z1" }),
      }),
    );
    expect(res.status).toBe(503);
  });

  it("GET verify fails closed without binding", async () => {
    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/payment=failed/);
  });

  it("GET verify fails when gateway verify rejects", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ result: 202, message: "failed" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/payment=failed/);
    expect(confirmPaidOrder).not.toHaveBeenCalled();
  });

  it("GET verify fails on amount mismatch", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: 100,
          amount: 1,
          refNumber: "R1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/payment=failed/);
    expect(confirmPaidOrder).not.toHaveBeenCalled();
  });

  it("GET verify coerces string amount and confirms", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: 100,
          amount: "100000",
          refNumber: "REF-STR",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    vi.mocked(confirmPaidOrder).mockResolvedValue({
      ok: true,
      order: { ...pendingOrder, status: "confirmed", trackingCode: "TRK1" },
      alreadyConfirmed: false,
      stockShortages: [],
    });

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/checkout\/success/);
  });

  it("GET verify fails when amount missing after success", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: 100,
          refNumber: "R1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/payment=failed/);
    expect(confirmPaidOrder).not.toHaveBeenCalled();
  });

  it("GET verify confirms on result 100 with matching amount", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: 100,
          amount: 100_000,
          refNumber: "REF-9",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    vi.mocked(confirmPaidOrder).mockResolvedValue({
      ok: true,
      order: { ...pendingOrder, status: "confirmed", trackingCode: "TRK1" },
      alreadyConfirmed: false,
    } as Awaited<ReturnType<typeof confirmPaidOrder>>);

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/checkout\/success/);
    expect(confirmPaidOrder).toHaveBeenCalledWith("ord-z1");
  });

  it("GET verify treats result 201 as idempotent success path", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: 201,
          amount: 100_000,
          refNumber: "REF-9",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    vi.mocked(confirmPaidOrder).mockResolvedValue({
      ok: true,
      order: { ...pendingOrder, status: "confirmed", trackingCode: "TRK1" },
      alreadyConfirmed: true,
    } as Awaited<ReturnType<typeof confirmPaidOrder>>);

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/checkout\/success/);
  });

  it("GET verify attempts refund when confirm fails after charge", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: 100,
          amount: 100_000,
          refNumber: "REF-9",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as typeof fetch;
    vi.mocked(confirmPaidOrder).mockResolvedValue({
      ok: false,
      reason: "not_payable",
    });

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/payment=failed/);
    expect(refundOrderAtGateway).toHaveBeenCalled();
  });

  it("GET verify redirects cancelled when success!=1", async () => {
    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=0&orderId=ord-z1",
      ),
    );
    expect(res.headers.get("location")).toMatch(/payment=cancelled/);
  });

  it("POST verify rejects mismatched trackId binding", async () => {
    await setOrderPaymentRef("ord-z1", "zibal", "9900");
    const res = await verifyPost(
      new Request("http://localhost/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "ord-z1", trackId: "OTHER" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});

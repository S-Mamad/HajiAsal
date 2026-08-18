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

vi.mock("@/lib/server/telegram-alert-queue", () => ({
  enqueueTelegramAlert: vi.fn(async () => ({ queued: true })),
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
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import {
  __resetPaymentRefsForTests,
  setOrderPaymentRef,
} from "@/lib/server/payment-refs";
import { POST as createPayment } from "@/app/api/checkout/create/route";
import {
  GET as verifyGet,
  POST as verifyPost,
} from "@/app/api/checkout/verify/route";

async function expectClientReplace(res: Response, pathPart: string) {
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toMatch(/text\/html/);
  const body = await res.text();
  expect(body).toMatch(/location\.replace/);
  expect(body).toContain(pathPart);
}

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
    (globalThis as typeof globalThis & { __payOrderHits?: number }).__payOrderHits =
      0;
    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      ok: true,
      retryAfterSec: 0,
    });
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
    expect(data.reused).toBe(false);
  });

  it("create reuses existing fresh trackId without calling gateway again", async () => {
    process.env.ZIBAL_MERCHANT = "live-merchant-1";
    await setOrderPaymentRef("ord-z1", "zibal", "15966442233311", {
      amountToman: 10_000,
      redirectUrl: "https://gateway.zibal.ir/start/15966442233311",
    });
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

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
    expect(data.reused).toBe(true);
    expect(data.trackId).toBe("15966442233311");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not reuse a trackId on the official sandbox merchant", async () => {
    process.env.ZIBAL_MERCHANT = "zibal";
    await setOrderPaymentRef("ord-z1", "zibal", "15966442233311", {
      amountToman: 10_000,
      redirectUrl: "https://gateway.zibal.ir/start/15966442233311",
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ result: 100, trackId: 99, message: "success" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await createPayment(
      new Request("http://localhost/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "ord-z1" }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.reused).toBe(false);
    expect(data.trackId).toBe("99");
    expect(fetchMock).toHaveBeenCalled();
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

  it("create real-gateway spam is rate limited after 3 creates", async () => {
    let track = 100;
    globalThis.fetch = vi.fn(async () => {
      track += 1;
      return new Response(
        JSON.stringify({ result: 100, trackId: track, message: "success" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    vi.mocked(checkRateLimitAsync).mockImplementation(async (key: string) => {
      if (String(key).startsWith("pay-create:order:")) {
        const g = globalThis as typeof globalThis & {
          __payOrderHits?: number;
        };
        g.__payOrderHits = (g.__payOrderHits ?? 0) + 1;
        if (g.__payOrderHits > 3) {
          return { ok: false, retryAfterSec: 60 };
        }
      }
      return { ok: true, retryAfterSec: 0 };
    });

    for (let i = 0; i < 3; i++) {
      __resetPaymentRefsForTests();
      const res = await createPayment(
        new Request("http://localhost/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: "ord-z1" }),
        }),
      );
      expect(res.status).toBe(200);
    }

    __resetPaymentRefsForTests();
    const blocked = await createPayment(
      new Request("http://localhost/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "ord-z1" }),
      }),
    );
    expect(blocked.status).toBe(429);
  });

  it("GET verify fails closed without binding", async () => {
    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    await expectClientReplace(res, "payment=failed");
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
    await expectClientReplace(res, "payment=failed");
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
    await expectClientReplace(res, "payment=failed");
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
      order: {
        id: "ord-z1",
        status: "confirmed",
        paymentMethod: "online",
        total: 10_000,
        trackingCode: "TRK1",
        userId: "u1",
        customer: {
          fullName: "تست",
          phone: "09121234567",
          address: "تهران",
          city: "تهران",
          province: "تهران",
          postalCode: "1234567890",
        },
        items: [],
        subtotal: 10_000,
        shipping: 0,
        discount: 0,
        createdAt: "2026-08-12T12:00:00.000Z",
        updatedAt: "2026-08-12T12:00:00.000Z",
      },
      alreadyConfirmed: false,
      stockShortages: [],
    });

    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=1&orderId=ord-z1",
      ),
    );
    await expectClientReplace(res, "checkout/success");
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
    await expectClientReplace(res, "payment=failed");
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
    await expectClientReplace(res, "checkout/success");
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
    await expectClientReplace(res, "checkout/success");
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
    await expectClientReplace(res, "payment=failed");
    expect(refundOrderAtGateway).toHaveBeenCalled();
  });

  it("GET verify redirects cancelled when success!=1", async () => {
    const res = await verifyGet(
      new Request(
        "http://localhost/api/checkout/verify?trackId=9900&success=0&orderId=ord-z1",
      ),
    );
    await expectClientReplace(res, "payment=cancelled");
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

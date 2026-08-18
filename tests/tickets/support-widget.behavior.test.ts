import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  isMysqlUsable: () => false,
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  mysqlQueryOne: vi.fn(),
  toIso: (v: unknown) => String(v),
  newId: () => `id_${Math.random().toString(36).slice(2, 10)}`,
}));

vi.mock("@/lib/server/production", () => ({
  canUseFilesystemPersistence: () => false,
  isProduction: () => false,
  allowTicketMysqlFallthrough: () => true,
  isMysqlDuplicateKey: () => false,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/server/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/orders")>();
  return {
    ...actual,
    getOrdersByUserId: vi.fn(async () => [
      { id: "o1", status: "pending_payment", total: 100_000 },
      { id: "o2", status: "pending_payment", total: 200_000 },
      { id: "o3", status: "pending_payment", total: 150_000 },
      { id: "o4", status: "pending_payment", total: 80_000 },
      { id: "s1", status: "shipped", total: 3_000_000 },
    ]),
  };
});

import { getSessionFromRequest } from "@/lib/auth/session";
import { __resetSupportTicketsMemoryForTests } from "@/lib/server/support-tickets";
import { GET, POST } from "@/app/api/account/support-widget/route";
import { POST as createTicket } from "@/app/api/account/tickets/route";

function asCustomer(fullName = "محمد") {
  (getSessionFromRequest as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    userId: "u-vip",
    phone: "09120000000",
    fullName,
    exp: Date.now() + 86_400_000,
  });
}

describe("support widget handshake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSupportTicketsMemoryForTests();
    (getSessionFromRequest as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      null,
    );
  });

  it("returns guest payload without 401", async () => {
    const res = await GET(
      new Request("http://localhost/api/account/support-widget?pageKind=cart"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.authenticated).toBe(false);
    expect(typeof data.withinHours).toBe("boolean");
  });

  it("builds VIP context for signed-in customer on cart", async () => {
    asCustomer();
    const res = await GET(
      new Request("http://localhost/api/account/support-widget?pageKind=cart"),
    );
    const data = await res.json();
    expect(data.authenticated).toBe(true);
    expect(data.pendingPaymentCount).toBe(4);
    expect(data.shippingOrderId).toBe("s1");
    expect(data.vip).toBe(true);
    expect(data.vipSummary).toContain("محمد");
    expect(data.vipSummary).toContain("سبد خرید");
    expect(data.vipSummary).toContain("ارزش حسابش بالاست");
  });

  it("stores vipSummary on newly created tickets", async () => {
    asCustomer();
    const res = await createTicket(
      new Request("http://localhost/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "کمک در ثبت سفارش",
          body: "سبدم گیر کرده",
          meta: { currentUrl: "https://hajiasal.ir/cart", pageKind: "cart", source: "support-fab" },
        }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ticket.meta.vipSummary).toContain("محمد");
    expect(data.ticket.meta.source).toBe("support-fab");
  });

  it("rejects anonymous POST handshake", async () => {
    const res = await POST(
      new Request("http://localhost/api/account/support-widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageKind: "cart" }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

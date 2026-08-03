import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  readJson,
} from "./harness";
import type { SellerOrderView } from "@/lib/server/sellers";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
    getSellerOrders: vi.fn(),
  };
});

vi.mock("@/lib/server/orders", () => ({
  updateOrderAdmin: vi.fn(async () => ({ id: "o1", status: "confirmed" })),
  getOrderById: vi.fn(async () => ({
    id: "o1",
    status: "confirmed",
    paymentMethod: "online",
    customer: { phone: "09120000000" },
    items: [],
    subtotal: 1,
    shipping: 0,
    discount: 0,
    total: 1,
    createdAt: "",
    updatedAt: "",
  })),
}));

vi.mock("@/lib/server/order-notify", () => ({
  notifyOrderStatusChange: vi.fn(async () => ({ sent: false, skipped: "test" })),
  resolveOrderNotifyEvent: vi.fn(() => null),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  mysqlExecute: vi.fn(),
  mysqlQueryOne: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/seller/orders/route";
import { getSellerFromRequest, getSellerOrders } from "@/lib/server/sellers";
import { updateOrderAdmin } from "@/lib/server/orders";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

function makeOrder(
  partial: Partial<SellerOrderView> & { id: string; soleOwner: boolean },
): SellerOrderView {
  return {
    status: "confirmed",
    paymentMethod: "online",
    customer: {
      fullName: "علی",
      phone: "09120000000",
      city: "تهران",
      address: "آدرس",
    },
    sellerItems: [],
    sellerSubtotal: 100_000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("seller orders behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1" });
  });

  it("GET returns seller orders", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder({ id: "o1", soleOwner: true }),
    ]);
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/orders"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect((json.orders as unknown[]).length).toBe(1);
    expect(getSellerOrders).toHaveBeenCalledWith("s1");
  });

  it("PATCH confirm succeeds when soleOwner", async () => {
    const order = makeOrder({ id: "o1", soleOwner: true, status: "confirmed" });
    vi.mocked(getSellerOrders).mockResolvedValue([order]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "o1", action: "confirm" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateOrderAdmin).toHaveBeenCalledWith("o1", {
      status: "confirmed",
    });
  });

  it("PATCH confirm rejects unpaid pending_payment orders", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder({ id: "o-unpaid", soleOwner: true, status: "pending_payment" }),
    ]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "o-unpaid", action: "confirm" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(updateOrderAdmin).not.toHaveBeenCalled();
  });

  it("PATCH confirm returns 403 when not soleOwner", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder({ id: "o-shared", soleOwner: false }),
    ]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "o-shared", action: "confirm" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(updateOrderAdmin).not.toHaveBeenCalled();
  });

  it("PATCH prepare returns 403 when not soleOwner", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder({ id: "o-shared", soleOwner: false }),
    ]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "o-shared", action: "prepare" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("PATCH tracking returns 403 when not soleOwner", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder({ id: "o-shared", soleOwner: false }),
    ]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "o-shared",
          action: "tracking",
          trackingCode: "TRK1",
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("PATCH returns 404 for unknown order", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: "missing", action: "confirm" }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("PATCH invalid body returns 400", async () => {
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nope" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("bulkConfirm only updates soleOwner orders", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder({ id: "o1", soleOwner: true }),
      makeOrder({ id: "o2", soleOwner: false }),
    ]);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulkConfirm",
          orderIds: ["o1", "o2"],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.updated).toBe(1);
    expect(updateOrderAdmin).toHaveBeenCalledTimes(1);
    expect(updateOrderAdmin).toHaveBeenCalledWith("o1", {
      status: "confirmed",
    });
  });
});

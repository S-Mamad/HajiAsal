import { beforeEach, describe, expect, it, vi } from "vitest";

const isMysqlConfigured = vi.fn(() => false);
const mysqlExecute = vi.fn();
const mysqlQuery = vi.fn();
const mysqlQueryOne = vi.fn();
const withMysqlTransaction = vi.fn();

vi.mock("./mysql", () => ({
  isMysqlConfigured: () => isMysqlConfigured(),
  mysqlExecute: (...args: unknown[]) => mysqlExecute(...args),
  mysqlQuery: (...args: unknown[]) => mysqlQuery(...args),
  mysqlQueryOne: (...args: unknown[]) => mysqlQueryOne(...args),
  withMysqlTransaction: (...args: unknown[]) => withMysqlTransaction(...args),
  asJson: (v: unknown) => JSON.stringify(v),
  parseJsonField: <T>(v: unknown, fallback: T) => {
    if (v == null) return fallback;
    if (typeof v === "string") {
      try {
        return JSON.parse(v) as T;
      } catch {
        return fallback;
      }
    }
    return v as T;
  },
  toIso: (v: unknown) => String(v),
}));

vi.mock("./production", () => ({
  canUseFilesystemPersistence: () => false,
}));

vi.mock("./order-stock", () => ({
  decrementStockForPaidOrder: vi.fn(async () => [] as string[]),
}));

vi.mock("./coupons", () => ({
  incrementCouponUsageForPaidOrder: vi.fn(async () => undefined),
}));

vi.mock("./products-store", () => ({
  getProductByIdAsync: vi.fn(async () => ({ id: "p1", sellerId: "seller-a" })),
}));

vi.mock("./seller-wallet", () => ({
  creditSellersForDeliveredOrder: vi.fn(async () => undefined),
}));

import { memoryPushOrder, memoryGetOrders } from "./memory-store";
import {
  confirmPaidOrder,
  expireStalePendingOrders,
  type StoredOrder,
} from "./orders";
import { decrementStockForPaidOrder } from "./order-stock";

function baseOrder(overrides: Partial<StoredOrder> = {}): StoredOrder {
  const now = new Date().toISOString();
  return {
    id: "HA-TEST-1",
    status: "pending_payment",
    paymentMethod: "online",
    customer: {
      fullName: "Test",
      phone: "09123456789",
      province: "تهران",
      city: "تهران",
      address: "آدرس تستی طولانی",
      postalCode: "1234567890",
    },
    items: [
      {
        productId: "p1",
        slug: "p1",
        title: "عسل",
        image: "",
        weight: { label: "1kg", grams: 1000, price: 100_000 },
        quantity: 1,
      },
    ],
    subtotal: 100_000,
    shipping: 0,
    discount: 0,
    total: 100_000,
    createdAt: now,
    updatedAt: now,
    trackingCode: "TRK-TEST",
    ...overrides,
  };
}

describe("confirmPaidOrder atomic confirm (memory)", () => {
  beforeEach(() => {
    isMysqlConfigured.mockReturnValue(false);
    const orders = memoryGetOrders() as StoredOrder[];
    orders.length = 0;
    vi.mocked(decrementStockForPaidOrder).mockClear();
    vi.mocked(decrementStockForPaidOrder).mockResolvedValue([]);
  });

  it("flips pending_payment → confirmed once and is idempotent", async () => {
    memoryPushOrder(baseOrder());

    const first = await confirmPaidOrder("HA-TEST-1");
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.alreadyConfirmed).toBe(false);
      expect(first.order.status).toBe("confirmed");
    }
    expect(decrementStockForPaidOrder).toHaveBeenCalledTimes(1);

    const second = await confirmPaidOrder("HA-TEST-1");
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.alreadyConfirmed).toBe(true);
    }
    expect(decrementStockForPaidOrder).toHaveBeenCalledTimes(1);
  });

  it("rejects cancelled orders", async () => {
    memoryPushOrder(baseOrder({ status: "cancelled" }));
    const result = await confirmPaidOrder("HA-TEST-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not_payable");
  });
});

describe("expireStalePendingOrders", () => {
  beforeEach(() => {
    isMysqlConfigured.mockReturnValue(false);
    const orders = memoryGetOrders() as StoredOrder[];
    orders.length = 0;
  });

  it("cancels unpaid orders older than ttl", async () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    memoryPushOrder(baseOrder({ id: "OLD", createdAt: old, updatedAt: old }));
    memoryPushOrder(baseOrder({ id: "NEW" }));

    const n = await expireStalePendingOrders(24 * 60 * 60 * 1000);
    expect(n).toBe(1);
    const orders = memoryGetOrders() as StoredOrder[];
    expect(orders.find((o) => o.id === "OLD")?.status).toBe("cancelled");
    expect(orders.find((o) => o.id === "NEW")?.status).toBe("pending_payment");
  });
});

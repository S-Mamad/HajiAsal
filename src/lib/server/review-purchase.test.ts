import { beforeEach, describe, expect, it, vi } from "vitest";

const isMysqlConfigured = vi.fn(() => false);

vi.mock("./mysql", () => ({
  isMysqlConfigured: () => isMysqlConfigured(),
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  mysqlQueryOne: vi.fn(),
  withMysqlTransaction: vi.fn(),
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

vi.mock("./products-store", () => ({
  getProductByIdAsync: vi.fn(async () => ({ id: "p1", sellerId: "seller-a" })),
}));

vi.mock("./seller-wallet", () => ({
  creditSellersForDeliveredOrder: vi.fn(async () => undefined),
}));

import { memoryGetOrders, memoryPushOrder } from "./memory-store";
import {
  hasPurchasedByPhone,
  hasPurchasedProductByPhone,
  type StoredOrder,
} from "./orders";

function baseOrder(overrides: Partial<StoredOrder> = {}): StoredOrder {
  const now = new Date().toISOString();
  return {
    id: "HA-REV-1",
    status: "confirmed",
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
    trackingCode: "TRK-REV",
    ...overrides,
  };
}

describe("review purchase eligibility", () => {
  beforeEach(() => {
    isMysqlConfigured.mockReturnValue(false);
    const orders = memoryGetOrders() as StoredOrder[];
    orders.length = 0;
  });

  it("hasPurchasedProductByPhone is true for paid order with matching product", async () => {
    memoryPushOrder(baseOrder({ status: "delivered" }));
    await expect(hasPurchasedProductByPhone("09123456789", "p1")).resolves.toBe(
      true,
    );
  });

  it("hasPurchasedProductByPhone is false for pending_payment", async () => {
    memoryPushOrder(baseOrder({ status: "pending_payment" }));
    await expect(hasPurchasedProductByPhone("09123456789", "p1")).resolves.toBe(
      false,
    );
  });

  it("hasPurchasedProductByPhone is false for wrong product", async () => {
    memoryPushOrder(baseOrder({ status: "confirmed" }));
    await expect(hasPurchasedProductByPhone("09123456789", "p2")).resolves.toBe(
      false,
    );
  });

  it("hasPurchasedProductByPhone is false for cancelled", async () => {
    memoryPushOrder(baseOrder({ status: "cancelled" }));
    await expect(hasPurchasedProductByPhone("09123456789", "p1")).resolves.toBe(
      false,
    );
  });

  it("hasPurchasedByPhone requires a paid status (not pending)", async () => {
    memoryPushOrder(baseOrder({ status: "pending_payment" }));
    await expect(hasPurchasedByPhone("09123456789")).resolves.toBe(false);

    memoryPushOrder(baseOrder({ id: "HA-REV-2", status: "processing" }));
    await expect(hasPurchasedByPhone("09123456789")).resolves.toBe(true);
  });
});

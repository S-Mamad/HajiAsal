import { beforeEach, describe, expect, it, vi } from "vitest";

const isMysqlConfigured = vi.fn(() => false);
const mysqlQuery = vi.fn();
const mysqlQueryOne = vi.fn();
const mysqlExecute = vi.fn();
const withMysqlTransaction = vi.fn();

vi.mock("./mysql", () => ({
  isMysqlConfigured: () => isMysqlConfigured(),
  mysqlExecute: (...args: unknown[]) => mysqlExecute(...args),
  mysqlQuery: (...args: unknown[]) => mysqlQuery(...args),
  mysqlQueryOne: (...args: unknown[]) => mysqlQueryOne(...args),
  withMysqlTransaction: (...args: unknown[]) => withMysqlTransaction(...args),
  toIso: (v: unknown) => String(v),
}));

vi.mock("./products-store", () => ({
  getAllProductsAsync: vi.fn(async () => [
    {
      id: "p1",
      sellerId: "seller-a",
      title: "Test",
      weightOptions: [{ label: "1kg", grams: 1000, price: 100_000 }],
    },
  ]),
}));

vi.mock("./sellers-store", () => ({
  getSellerByIdAsync: vi.fn(async () => ({
    id: "seller-a",
    commissionPercent: 10,
  })),
}));

import {
  __resetSellerWalletMemoryForTests,
  addLedgerEntry,
  createWithdrawal,
  creditSellersForDeliveredOrder,
  getSellerWalletBalance,
  reverseSaleCreditsForOrder,
  WalletMysqlError,
} from "./seller-wallet";
import type { StoredOrder } from "./orders";

describe("seller wallet memory path", () => {
  beforeEach(() => {
    __resetSellerWalletMemoryForTests();
    isMysqlConfigured.mockReturnValue(false);
  });

  it("credits sale on delivered order and rejects withdraw without sheba", async () => {
    const order = {
      id: "ord-1",
      status: "delivered",
      items: [
        {
          productId: "p1",
          quantity: 2,
          weight: { label: "1kg", grams: 1000, price: 100_000 },
        },
      ],
    } as unknown as StoredOrder;

    await creditSellersForDeliveredOrder(order);
    // Idempotent
    await creditSellersForDeliveredOrder(order);

    const bal = await getSellerWalletBalance("seller-a");
    // 200_000 * 0.9 = 180_000
    expect(bal.available).toBe(180_000);

    await expect(
      createWithdrawal({ sellerId: "seller-a", amount: 10_000 }),
    ).rejects.toThrow(/شبا/);

    const w = await createWithdrawal({
      sellerId: "seller-a",
      amount: 50_000,
      bankSheba: "IR123456789012345678901234",
    });
    expect(w.status).toBe("pending");

    const after = await getSellerWalletBalance("seller-a");
    expect(after.available).toBe(130_000);
  });

  it("reverses sale credits on refund idempotently", async () => {
    const order = {
      id: "ord-refund",
      status: "delivered",
      items: [
        {
          productId: "p1",
          quantity: 1,
          weight: { label: "1kg", grams: 1000, price: 100_000 },
        },
      ],
    } as unknown as StoredOrder;

    await creditSellersForDeliveredOrder(order);
    expect((await getSellerWalletBalance("seller-a")).available).toBe(90_000);

    await reverseSaleCreditsForOrder(order);
    await reverseSaleCreditsForOrder(order);
    expect((await getSellerWalletBalance("seller-a")).available).toBe(0);
  });

  it("addLedgerEntry works without MySQL", async () => {
    await addLedgerEntry({
      sellerId: "s1",
      type: "sale",
      amount: 1000,
      status: "available",
    });
    const bal = await getSellerWalletBalance("s1");
    expect(bal.available).toBe(1000);
  });
});

describe("seller wallet MySQL hard-fail", () => {
  beforeEach(() => {
    __resetSellerWalletMemoryForTests();
    isMysqlConfigured.mockReturnValue(true);
    mysqlQuery.mockReset();
  });

  it("does not fall back to memory when MySQL read fails", async () => {
    mysqlQuery.mockRejectedValueOnce(new Error("connection refused"));
    await expect(getSellerWalletBalance("s1")).rejects.toBeInstanceOf(
      WalletMysqlError,
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mysqlQuery = vi.fn();
const isMysqlConfigured = vi.fn(() => true);

vi.mock("./mysql", () => ({
  isMysqlConfigured: () => isMysqlConfigured(),
  mysqlExecute: vi.fn(),
  mysqlQuery: (...args: unknown[]) => mysqlQuery(...args),
  toBool: (v: unknown) => Boolean(v),
  toIso: (v: unknown) => String(v),
}));

import { validateCouponAsync } from "./coupons";

const sellerRow = {
  seller_id: "seller-a",
  code: "SELL10",
  type: "percent",
  value: 10,
  min_order: 0,
  active: 1,
  used_count: 0,
  max_uses: null,
  starts_at: null,
  ends_at: null,
};

describe("seller coupon cart scope (money-critical)", () => {
  beforeEach(() => {
    mysqlQuery.mockReset();
    isMysqlConfigured.mockReturnValue(true);
    // Platform coupons table empty → fall through to seller_discounts
    mysqlQuery.mockResolvedValueOnce([]);
  });

  it("rejects seller coupon when cart has no seller-tagged products", async () => {
    mysqlQuery.mockResolvedValueOnce([sellerRow]);
    const result = await validateCouponAsync("SELL10", 500_000, {
      sellerIdsInCart: [],
      sellerLineSubtotals: {},
    });
    expect(result.valid).toBe(false);
    expect(result.discount).toBe(0);
  });

  it("rejects seller coupon when options omit seller scope (legacy fallback)", async () => {
    mysqlQuery.mockResolvedValueOnce([sellerRow]);
    const result = await validateCouponAsync("SELL10", 500_000);
    expect(result.valid).toBe(false);
    expect(result.discount).toBe(0);
  });

  it("does not discount full cart — only seller line subtotal", async () => {
    mysqlQuery.mockResolvedValueOnce([sellerRow]);
    const result = await validateCouponAsync("SELL10", 500_000, {
      sellerIdsInCart: ["seller-a"],
      sellerLineSubtotals: { "seller-a": 100_000 },
    });
    expect(result.valid).toBe(true);
    // 10% of 100_000, not 10% of 500_000
    expect(result.discount).toBe(10_000);
  });

  it("rejects when another seller is also in the cart", async () => {
    mysqlQuery.mockResolvedValueOnce([sellerRow]);
    const result = await validateCouponAsync("SELL10", 200_000, {
      sellerIdsInCart: ["seller-a", "seller-b"],
      sellerLineSubtotals: { "seller-a": 100_000, "seller-b": 100_000 },
    });
    expect(result.valid).toBe(false);
    expect(result.discount).toBe(0);
  });
});

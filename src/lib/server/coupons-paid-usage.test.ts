import { beforeEach, describe, expect, it, vi } from "vitest";

const mysqlExecute = vi.fn();
const mysqlQuery = vi.fn();
const isMysqlConfigured = vi.fn(() => true);

vi.mock("./mysql", () => ({
  isMysqlConfigured: () => isMysqlConfigured(),
  mysqlExecute: (...args: unknown[]) => mysqlExecute(...args),
  mysqlQuery: (...args: unknown[]) => mysqlQuery(...args),
  toBool: (v: unknown) => Boolean(v),
  toIso: (v: unknown) => String(v),
}));

import {
  incrementCouponUsageForPaidOrder,
  incrementSellerDiscountUsage,
} from "./coupons";

describe("seller coupon usage after payment", () => {
  beforeEach(() => {
    mysqlExecute.mockReset();
    mysqlQuery.mockReset();
    isMysqlConfigured.mockReturnValue(true);
    mysqlExecute.mockResolvedValue({ affectedRows: 1 });
  });

  it("incrementSellerDiscountUsage guards max_uses in SQL", async () => {
    await incrementSellerDiscountUsage("SAVE10", "seller-a");
    expect(mysqlExecute).toHaveBeenCalledTimes(1);
    const sql = String(mysqlExecute.mock.calls[0]?.[0] ?? "");
    expect(sql).toMatch(/max_uses IS NULL/i);
    expect(sql).toMatch(/used_count/i);
    expect(mysqlExecute.mock.calls[0]?.[1]).toEqual(["SAVE10", "seller-a"]);
  });

  it("incrementCouponUsageForPaidOrder resolves seller then increments", async () => {
    mysqlQuery.mockResolvedValueOnce([{ seller_id: "seller-a" }]);
    await incrementCouponUsageForPaidOrder({
      couponCode: "save10",
      sellerIdsInOrder: ["seller-a", "seller-b"],
    });
    expect(mysqlQuery).toHaveBeenCalled();
    expect(mysqlExecute).toHaveBeenCalled();
    expect(mysqlExecute.mock.calls[0]?.[1]).toEqual(["SAVE10", "seller-a"]);
  });

  it("skips increment when MySQL is not configured", async () => {
    isMysqlConfigured.mockReturnValue(false);
    await incrementCouponUsageForPaidOrder({
      couponCode: "SAVE10",
      sellerIdsInOrder: ["seller-a"],
    });
    expect(mysqlExecute).not.toHaveBeenCalled();
  });
});

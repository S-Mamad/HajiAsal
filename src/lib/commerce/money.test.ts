import { describe, expect, it } from "vitest";
import {
  computeDiscountAmount,
  computeOrderTotal,
} from "@/lib/commerce/money";

describe("computeOrderTotal", () => {
  it("never goes negative when discount exceeds payable", () => {
    expect(computeOrderTotal(100_000, 30_000, 200_000)).toBe(0);
  });

  it("subtracts discount from subtotal+shipping", () => {
    expect(computeOrderTotal(400_000, 50_000, 50_000)).toBe(400_000);
  });
});

describe("computeDiscountAmount", () => {
  it("caps fixed discount to subtotal", () => {
    expect(
      computeDiscountAmount(
        { type: "fixed", value: 500_000 },
        100_000,
      ),
    ).toBe(100_000);
  });

  it("applies percent with maxDiscount", () => {
    expect(
      computeDiscountAmount(
        { type: "percent", value: 10, maxDiscount: 150_000 },
        2_000_000,
      ),
    ).toBe(150_000);
  });
});

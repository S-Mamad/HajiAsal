import { describe, expect, it } from "vitest";
import {
  clampCartQuantity,
  isProductPurchasable,
  maxPurchasableQty,
} from "@/lib/product-availability";

describe("product-availability", () => {
  it("treats inStock false as not purchasable", () => {
    expect(isProductPurchasable({ inStock: false, stockQty: 5 })).toBe(false);
    expect(maxPurchasableQty({ inStock: false, stockQty: 5 })).toBe(0);
  });

  it("treats stockQty 0 as not purchasable", () => {
    expect(isProductPurchasable({ inStock: true, stockQty: 0 })).toBe(false);
  });

  it("clamps quantity to stock", () => {
    expect(clampCartQuantity(9, { inStock: true, stockQty: 3 })).toBe(3);
    expect(clampCartQuantity(0, { inStock: true, stockQty: 3 })).toBe(1);
  });
});

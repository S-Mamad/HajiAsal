import { describe, expect, it } from "vitest";
import { getEffectiveWeightPrice, getDisplayPrice } from "@/lib/products";
import type { Product } from "@/types";
import couponsData from "@/data/coupons.json";

type StaticCoupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
};

function validateStaticCoupon(code: string, subtotal: number) {
  const coupons = couponsData as StaticCoupon[];
  const normalized = code.trim().toUpperCase();
  const coupon = coupons.find(
    (c) => c.code.toUpperCase() === normalized && c.active,
  );
  if (!coupon) return { valid: false, discount: 0 };
  if (subtotal < coupon.minOrder) return { valid: false, discount: 0 };
  let discount =
    coupon.type === "percent"
      ? Math.floor((subtotal * coupon.value) / 100)
      : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return { valid: true, discount };
}

describe("getEffectiveWeightPrice", () => {
  const product = {
    weightOptions: [
      { label: "۵۰۰ گرم", grams: 500, price: 400_000 },
      { label: "۱ کیلو", grams: 1000, price: 700_000 },
    ],
    discountPrice: 360_000,
  } satisfies Pick<Product, "weightOptions" | "discountPrice">;

  it("scales sale across weight tiers from min price", () => {
    const half = getEffectiveWeightPrice(product, product.weightOptions[0]!);
    const kilo = getEffectiveWeightPrice(product, product.weightOptions[1]!);
    expect(half).toBe(360_000);
    expect(kilo).toBe(Math.round(700_000 * (360_000 / 400_000)));
  });

  it("returns list price when no discount", () => {
    expect(
      getEffectiveWeightPrice(
        { weightOptions: product.weightOptions },
        product.weightOptions[0]!,
      ),
    ).toBe(400_000);
  });
});

describe("getDisplayPrice", () => {
  it("prefers discountPrice when lower than min", () => {
    const product = {
      weightOptions: [{ label: "۵۰۰ گرم", grams: 500, price: 400_000 }],
      discountPrice: 350_000,
    } as Product;
    expect(getDisplayPrice(product)).toBe(350_000);
  });
});

describe("static coupon fixtures", () => {
  it("applies HAJI10 percent with max cap", () => {
    expect(validateStaticCoupon("HAJI10", 300_000).discount).toBe(30_000);
    expect(validateStaticCoupon("haji10", 2_000_000).discount).toBe(150_000);
  });

  it("rejects below minOrder", () => {
    const result = validateStaticCoupon("HAJI10", 100_000);
    expect(result.valid).toBe(false);
    expect(result.discount).toBe(0);
  });

  it("applies fixed ASAL50", () => {
    expect(validateStaticCoupon("ASAL50", 400_000)).toEqual({
      valid: true,
      discount: 50_000,
    });
  });

  it("rejects unknown codes", () => {
    expect(validateStaticCoupon("NOPE", 1_000_000).valid).toBe(false);
  });
});

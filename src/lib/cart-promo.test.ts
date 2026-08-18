import { describe, expect, it } from "vitest";
import {
  interpolateAmountText,
  pickImpulseProducts,
  resolveCartPromo,
} from "@/lib/cart-promo";
import type { Product } from "@/types";

function product(id: string, inStock = true): Product {
  return {
    id,
    slug: id,
    title: id,
    description: "",
    images: ["/x.webp"],
    category: "honey",
    origin: "",
    inStock,
    weightOptions: [{ grams: 500, label: "۵۰۰ گرم", price: 1000 }],
    rating: 5,
    reviewCount: 1,
  } as unknown as Product;
}

describe("resolveCartPromo", () => {
  it("defaults to showing both merchandising blocks", () => {
    const promo = resolveCartPromo({});
    expect(promo.freeShippingBarEnabled).toBe(true);
    expect(promo.impulseEnabled).toBe(true);
    expect(promo.impulseMode).toBe("popular");
    expect(promo.impulseLimit).toBe(8);
  });

  it("honors explicit disable flags and clamps limit", () => {
    const promo = resolveCartPromo({
      cartPromo: {
        freeShippingBarEnabled: false,
        impulseEnabled: false,
        impulseMode: "manual",
        impulseProductIds: ["a", "a", "  ", "b"],
        impulseLimit: 99,
        impulseTitle: "  ",
      },
    });
    expect(promo.freeShippingBarEnabled).toBe(false);
    expect(promo.impulseEnabled).toBe(false);
    expect(promo.impulseMode).toBe("manual");
    expect(promo.impulseProductIds).toEqual(["a", "b"]);
    expect(promo.impulseLimit).toBe(16);
    expect(promo.impulseTitle).toBe("پیشنهادهای لحظه آخری");
  });
});

describe("interpolateAmountText", () => {
  it("replaces the amount token", () => {
    expect(
      interpolateAmountText("فقط {amount} تا ارسال رایگان", "۱۲۰٬۰۰۰ تومان"),
    ).toBe("فقط ۱۲۰٬۰۰۰ تومان تا ارسال رایگان");
  });
});

describe("pickImpulseProducts", () => {
  const catalog = [
    product("a"),
    product("b", false),
    product("c"),
    product("d"),
  ];

  it("skips in-cart and out-of-stock in popular mode", () => {
    expect(
      pickImpulseProducts(catalog, {
        mode: "popular",
        ids: [],
        inCartIds: new Set(["a"]),
        limit: 8,
      }).map((p) => p.id),
    ).toEqual(["c", "d"]);
  });

  it("keeps admin order in manual mode", () => {
    expect(
      pickImpulseProducts(catalog, {
        mode: "manual",
        ids: ["d", "missing", "a", "b"],
        inCartIds: new Set(),
        limit: 8,
      }).map((p) => p.id),
    ).toEqual(["d", "a"]);
  });
});

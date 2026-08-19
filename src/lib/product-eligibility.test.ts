import { describe, expect, it } from "vitest";
import {
  getDiscountPercent,
  isProductOnSale,
  isSellableCatalogProduct,
} from "@/lib/product-eligibility";
import type { Product } from "@/types";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "p1",
    title: "Test",
    shortDescription: "",
    longDescription: "",
    category: "mountain",
    categoryLabel: "کوهستان",
    images: ["/img.webp"],
    weightOptions: [{ label: "500g", grams: 500, price: 100_000 }],
    inStock: true,
    rating: 4.5,
    reviewCount: 10,
    ...overrides,
  };
}

describe("isSellableCatalogProduct", () => {
  it("rejects out of stock", () => {
    expect(isSellableCatalogProduct(baseProduct({ inStock: false }))).toBe(
      false,
    );
  });

  it("rejects inStock true but stockQty zero", () => {
    expect(
      isSellableCatalogProduct(
        baseProduct({ inStock: true, stockQty: 0 }),
      ),
    ).toBe(false);
  });

  it("accepts unlimited stock (no stockQty)", () => {
    expect(isSellableCatalogProduct(baseProduct())).toBe(true);
  });

  it("rejects non-active status", () => {
    expect(
      isSellableCatalogProduct(baseProduct({ status: "draft" })),
    ).toBe(false);
  });

  it("rejects deleted products", () => {
    expect(
      isSellableCatalogProduct(
        baseProduct({ deletedAt: new Date().toISOString() }),
      ),
    ).toBe(false);
  });

  it("rejects unapproved seller products", () => {
    expect(
      isSellableCatalogProduct(
        baseProduct({
          sellerId: "s1",
          approvalStatus: "pending",
        }),
      ),
    ).toBe(false);
  });
});

describe("isProductOnSale", () => {
  it("returns true when discountPrice is below min weight price", () => {
    expect(
      isProductOnSale(baseProduct({ discountPrice: 80_000 })),
    ).toBe(true);
  });

  it("returns false when discountPrice equals min price", () => {
    expect(
      isProductOnSale(baseProduct({ discountPrice: 100_000 })),
    ).toBe(false);
  });

  it("returns false when no discountPrice", () => {
    expect(isProductOnSale(baseProduct())).toBe(false);
  });
});

describe("getDiscountPercent", () => {
  it("computes rounded percent", () => {
    expect(
      getDiscountPercent(baseProduct({ discountPrice: 75_000 })),
    ).toBe(25);
  });

  it("returns 0 when not on sale", () => {
    expect(getDiscountPercent(baseProduct())).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  filterProducts,
  getDisplayPrice,
  normalizeSearchText,
  scoreProductSearch,
  searchProducts,
} from "@/lib/products";
import type { Product } from "@/types";

function makeProduct(overrides: Partial<Product> & Pick<Product, "id" | "title">): Product {
  return {
    slug: overrides.id,
    shortDescription: "توضیح کوتاه",
    longDescription: "توضیح بلند",
    category: "mountain",
    categoryLabel: "عسل کوهستان",
    images: ["/x.jpg"],
    weightOptions: [{ label: "۱ کیلو", grams: 1000, price: 500_000 }],
    inStock: true,
    rating: 4.5,
    reviewCount: 10,
    ...overrides,
  };
}

describe("normalizeSearchText", () => {
  it("maps Arabic yeh/kaf to Persian forms", () => {
    expect(normalizeSearchText("عسل كوهي")).toBe("عسل کوهی");
  });

  it("maps Persian digits to ASCII", () => {
    expect(normalizeSearchText("سفارش ۱۲۳")).toContain("123");
  });
});

describe("searchProducts", () => {
  const catalog = [
    makeProduct({
      id: "a",
      title: "عسل کوهستان البرز",
      shortDescription: "طعم ملایم",
      reviewCount: 5,
    }),
    makeProduct({
      id: "b",
      title: "ژل رویال تازه",
      category: "royal-jelly",
      categoryLabel: "ژل رویال",
      shortDescription: "تقویت بدن",
      reviewCount: 20,
    }),
    makeProduct({
      id: "c",
      title: "شهد آویشن",
      shortDescription: "عطر آویشن کوهی",
      longDescription: "برداشت از مراتع",
      reviewCount: 8,
    }),
  ];

  it("ranks exact/prefix title matches above body matches", () => {
    const results = searchProducts("عسل", catalog);
    expect(results[0]!.id).toBe("a");
    expect(results.map((p) => p.id)).toContain("c");
  });

  it("finds products via Persian/Arabic variant letters", () => {
    const results = searchProducts("كوهستان", catalog);
    expect(results.map((p) => p.id)).toContain("a");
  });

  it("scores title higher than body", () => {
    const titleHit = scoreProductSearch(catalog[0]!, "عسل");
    const bodyHit = scoreProductSearch(catalog[2]!, "مراتع");
    expect(titleHit).toBeGreaterThan(bodyHit);
  });

  it("matches multi-word queries when all tokens hit", () => {
    const results = searchProducts("عسل کوهستان", catalog);
    expect(results[0]?.id).toBe("a");
  });
});

describe("filterProducts sort", () => {
  const catalog = [
    makeProduct({
      id: "cheap",
      title: "ارزان",
      reviewCount: 1,
      weightOptions: [{ label: "۱ کیلو", grams: 1000, price: 300_000 }],
      createdAt: "2024-01-01T00:00:00.000Z",
    }),
    makeProduct({
      id: "sale",
      title: "تخفیف‌دار",
      reviewCount: 50,
      weightOptions: [{ label: "۱ کیلو", grams: 1000, price: 800_000 }],
      discountPrice: 250_000,
      createdAt: "2024-06-01T00:00:00.000Z",
      isBestseller: true,
    }),
    makeProduct({
      id: "new",
      title: "جدید",
      reviewCount: 3,
      isNew: true,
      weightOptions: [{ label: "۱ کیلو", grams: 1000, price: 600_000 }],
      createdAt: "2025-01-01T00:00:00.000Z",
    }),
    makeProduct({
      id: "old-flag",
      title: "پرچم جدید بدون تاریخ",
      reviewCount: 2,
      isNew: true,
      weightOptions: [{ label: "۱ کیلو", grams: 1000, price: 550_000 }],
    }),
  ];

  it("sorts price-asc by display (sale) price", () => {
    const sorted = filterProducts({ sort: "price-asc" }, catalog);
    expect(sorted.map((p) => p.id)).toEqual([
      "sale",
      "cheap",
      "old-flag",
      "new",
    ]);
    expect(getDisplayPrice(sorted[0]!)).toBe(250_000);
  });

  it("sorts newest by createdAt then isNew flag", () => {
    const sorted = filterProducts({ sort: "newest" }, catalog);
    expect(sorted[0]!.id).toBe("new");
    expect(sorted.map((p) => p.id).slice(0, 3)).toEqual([
      "new",
      "sale",
      "cheap",
    ]);
  });

  it("sorts popular by reviewCount with bestseller tiebreak", () => {
    const sorted = filterProducts({ sort: "popular" }, catalog);
    expect(sorted[0]!.id).toBe("sale");
  });

  it("filters maxPrice using display price so discounted items stay visible", () => {
    const filtered = filterProducts(
      { sort: "price-asc", maxPrice: 280_000 },
      catalog,
    );
    expect(filtered.map((p) => p.id)).toEqual(["sale"]);
  });

  it("filters onSaleOnly using discountPrice below list min", () => {
    const filtered = filterProducts({ onSaleOnly: true }, catalog);
    expect(filtered.map((p) => p.id)).toEqual(["sale"]);
  });

  it("inStockOnly rejects inStock true with stockQty zero", () => {
    const stocked = makeProduct({
      id: "zero-stock",
      title: "zero",
      inStock: true,
      stockQty: 0,
    });
    const filtered = filterProducts({ inStockOnly: true }, [
      ...catalog,
      stocked,
    ]);
    expect(filtered.some((p) => p.id === "zero-stock")).toBe(false);
  });
});

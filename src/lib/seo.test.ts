import { describe, expect, it } from "vitest";
import { buildProductMetadata, parseSeoRobots } from "@/lib/seo";
import type { Product } from "@/types";

describe("parseSeoRobots", () => {
  it("returns undefined for empty input", () => {
    expect(parseSeoRobots()).toBeUndefined();
    expect(parseSeoRobots("")).toBeUndefined();
    expect(parseSeoRobots("   ")).toBeUndefined();
  });

  it("parses index/follow directives", () => {
    expect(parseSeoRobots("index,follow")).toEqual({
      index: true,
      follow: true,
    });
    expect(parseSeoRobots("noindex, nofollow")).toEqual({
      index: false,
      follow: false,
    });
    expect(parseSeoRobots("noindex")).toEqual({
      index: false,
      follow: true,
    });
  });
});

describe("buildProductMetadata", () => {
  const baseProduct: Product = {
    id: "p1",
    slug: "mountain-honey",
    title: "عسل کوهستان",
    shortDescription: "توضیح کوتاه",
    longDescription: "توضیح کامل",
    category: "mountain",
    categoryLabel: "عسل کوهستان",
    images: ["/images/a.webp"],
    weightOptions: [{ label: "۱ کیلو", grams: 1000, price: 500000 }],
    inStock: true,
    rating: 4.8,
    reviewCount: 12,
  };

  it("falls back to product fields when seo is missing", () => {
    const meta = buildProductMetadata(baseProduct);
    expect(meta.title).toBe("عسل کوهستان");
    expect(meta.description).toBe("توضیح کوتاه");
    expect(meta.alternates?.canonical).toBe("/product/mountain-honey");
  });

  it("prefers seo overrides", () => {
    const meta = buildProductMetadata({
      ...baseProduct,
      seo: {
        title: "عنوان سئو",
        description: "توضیح سئو",
        ogTitle: "OG Title",
        ogImage: "/images/og.webp",
        robots: "noindex,nofollow",
        canonical: "https://example.com/custom",
      },
    });
    expect(meta.title).toBe("عنوان سئو");
    expect(meta.description).toBe("توضیح سئو");
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.alternates?.canonical).toBe("https://example.com/custom");
    expect(meta.openGraph?.title).toBe("OG Title");
  });
});

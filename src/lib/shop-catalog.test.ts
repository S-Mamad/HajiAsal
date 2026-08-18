import { describe, expect, it } from "vitest";
import {
  parseSortOption,
  SHOP_PAGE_SIZE,
  shopSortLabel,
} from "./shop-catalog";

describe("shop catalog paging", () => {
  it("loads twenty products per page", () => {
    expect(SHOP_PAGE_SIZE).toBe(20);
  });
});

describe("parseSortOption", () => {
  it("keeps valid sort values", () => {
    expect(parseSortOption("price-asc")).toBe("price-asc");
    expect(parseSortOption("newest")).toBe("newest");
  });

  it("falls back to popular for missing or invalid values", () => {
    expect(parseSortOption(null)).toBe("popular");
    expect(parseSortOption("")).toBe("popular");
    expect(parseSortOption("cheap")).toBe("popular");
  });

  it("labels known sorts in Persian", () => {
    expect(shopSortLabel("price-desc")).toBe("گران‌ترین");
  });
});

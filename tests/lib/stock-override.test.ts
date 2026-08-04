import { describe, expect, it } from "vitest";
import { syncStockFields } from "@/lib/server/product-stock-sync";

/**
 * Mirrors products-store normalizeStockOverrideValue behavior for unit coverage
 * without pulling MySQL/filesystem deps.
 */
function normalizeStockOverrideValue(
  value: boolean | { inStock: boolean; stockQty?: number },
  fallback: { inStock: boolean; stockQty?: number },
): { inStock: boolean; stockQty?: number } {
  if (typeof value === "boolean") {
    if (!value) {
      return {
        inStock: false,
        ...(typeof fallback.stockQty === "number" ? { stockQty: 0 } : {}),
      };
    }
    if (typeof fallback.stockQty === "number" && fallback.stockQty <= 0) {
      return { inStock: true, stockQty: 1 };
    }
    return { inStock: true, stockQty: fallback.stockQty };
  }
  const qty =
    typeof value.stockQty === "number"
      ? Math.max(0, value.stockQty)
      : fallback.stockQty;
  const inStock =
    value.inStock !== false && (typeof qty !== "number" || qty > 0);
  return { inStock, stockQty: qty };
}

describe("stock override object format", () => {
  it("applies OOS object override correctly (not truthy object bug)", () => {
    const base = { inStock: true, stockQty: 5 };
    const next = normalizeStockOverrideValue(
      { inStock: false, stockQty: 0 },
      base,
    );
    const synced = syncStockFields({ ...base, ...next });
    expect(synced.inStock).toBe(false);
    expect(synced.stockQty).toBe(0);
  });

  it("applies in-stock object override with qty", () => {
    const base = { inStock: false, stockQty: 0 };
    const next = normalizeStockOverrideValue(
      { inStock: true, stockQty: 12 },
      base,
    );
    expect(next.inStock).toBe(true);
    expect(next.stockQty).toBe(12);
  });

  it("legacy boolean false still works", () => {
    const next = normalizeStockOverrideValue(false, {
      inStock: true,
      stockQty: 3,
    });
    expect(next.inStock).toBe(false);
    expect(next.stockQty).toBe(0);
  });
});

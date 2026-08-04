import type { Product } from "@/types";

type StockSlice = Pick<Product, "inStock" | "stockQty">;

/**
 * Align inStock with a numeric stockQty when quantity is tracked.
 * Missing stockQty means unlimited — never invent a quantity on read.
 */
export function syncStockFields<T extends StockSlice>(product: T): T {
  if (typeof product.stockQty !== "number") {
    return product;
  }
  const inStock = product.inStock !== false && product.stockQty > 0;
  if (product.inStock === inStock) return product;
  return { ...product, inStock };
}

/**
 * Apply explicit stock updates from admin/API/order flows.
 * - Numeric stockQty is authoritative.
 * - null stockQty clears tracking (unlimited) when supported by caller.
 * - Toggling inStock alone never invents a qty for previously-unlimited products.
 */
export function applyStockUpdates(
  existing: StockSlice,
  updates: {
    inStock?: boolean;
    stockQty?: number | null;
  },
): StockSlice {
  let inStock = existing.inStock !== false;
  let stockQty = existing.stockQty;

  if (typeof updates.stockQty === "number") {
    stockQty = updates.stockQty;
    inStock =
      typeof updates.inStock === "boolean"
        ? updates.inStock && updates.stockQty > 0
        : updates.stockQty > 0;
  } else if (updates.stockQty === null) {
    stockQty = undefined;
    if (typeof updates.inStock === "boolean") {
      inStock = updates.inStock;
    }
  } else if (typeof updates.inStock === "boolean") {
    inStock = updates.inStock;
    if (!updates.inStock) {
      if (typeof stockQty === "number") {
        stockQty = 0;
      }
    } else if (typeof stockQty === "number" && stockQty <= 0) {
      stockQty = 1;
    }
  }

  return { inStock, stockQty };
}

/** Defaults only for create payloads — empty stock stays unlimited. */
export function stockDefaultsForCreate(product: StockSlice): StockSlice {
  if (typeof product.stockQty === "number") {
    return {
      stockQty: product.stockQty,
      inStock: product.stockQty > 0 && product.inStock !== false,
    };
  }
  if (product.inStock === false) {
    return { inStock: false, stockQty: 0 };
  }
  return {
    inStock: true,
    stockQty: undefined,
  };
}

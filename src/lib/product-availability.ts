import type { Product } from "@/types";

/** Soft checkout max (matches order validation). */
export const CART_MAX_QTY = 20;

export function isProductPurchasable(
  product: Pick<Product, "inStock" | "stockQty">,
): boolean {
  if (!product.inStock) return false;
  if (typeof product.stockQty === "number" && product.stockQty <= 0) {
    return false;
  }
  return true;
}

export function maxPurchasableQty(
  product: Pick<Product, "inStock" | "stockQty">,
): number {
  if (!isProductPurchasable(product)) return 0;
  if (typeof product.stockQty === "number") {
    return Math.min(CART_MAX_QTY, Math.max(0, product.stockQty));
  }
  return CART_MAX_QTY;
}

export function clampCartQuantity(
  requested: number,
  product: Pick<Product, "inStock" | "stockQty">,
): number {
  const max = maxPurchasableQty(product);
  if (max <= 0) return 0;
  return Math.min(Math.max(1, requested), max);
}

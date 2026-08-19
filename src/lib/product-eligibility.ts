import { isProductPurchasable } from "@/lib/product-availability";
import { getDisplayPrice, getMinPrice } from "@/lib/products";
import type { Product } from "@/types";

/** Catalog product that is active, approved, and purchasable (stock-aware). */
export function isSellableCatalogProduct(product: Product): boolean {
  if (product.deletedAt) return false;
  if ((product.status ?? "active") !== "active") return false;
  if (product.sellerId) {
    const approval = product.approvalStatus ?? "approved";
    if (approval !== "approved") return false;
  }
  return isProductPurchasable(product);
}

/** Product has an active sale price below list minimum. */
export function isProductOnSale(product: Product): boolean {
  const min = getMinPrice(product);
  if (min <= 0) return false;
  return (
    typeof product.discountPrice === "number" &&
    product.discountPrice > 0 &&
    product.discountPrice < min
  );
}

/** Rounded discount percentage for display badges. */
export function getDiscountPercent(product: Product): number {
  if (!isProductOnSale(product)) return 0;
  const min = getMinPrice(product);
  const sale = getDisplayPrice(product);
  if (min <= 0 || sale >= min) return 0;
  return Math.round(((min - sale) / min) * 100);
}

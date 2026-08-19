import type { CartItem } from "@/types";
import { getEffectiveWeightPrice } from "@/lib/products";
import { imageFitForSrc } from "@/lib/product-image";
import { shippingCostForMethod } from "@/lib/shipping";
import { getHeldQtyForProduct } from "./cart-holds";
import { getProductByIdAsync } from "./products-store";
import { getSiteSettings } from "./site-settings";

export type { ShippingMethodId } from "@/lib/shipping";
export { shippingCostForMethod } from "@/lib/shipping";

export async function calcShippingCost(
  method: string | undefined,
  subtotal: number,
): Promise<number> {
  const settings = await getSiteSettings();
  return shippingCostForMethod(method, subtotal, settings);
}

/**
 * Rebuild cart lines from catalog prices (never trust client prices).
 * Soft cart holds from other sessions reduce available stock.
 */
export async function rebuildOrderItems(
  rawItems: CartItem[],
  opts?: { holdSessionId?: string | null },
): Promise<
  | { ok: true; items: CartItem[]; subtotal: number }
  | { ok: false; message: string }
> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, message: "سبد خرید خالی است" };
  }
  if (rawItems.length > 40) {
    return { ok: false, message: "تعداد اقلام سفارش بیش از حد مجاز است" };
  }

  const items: CartItem[] = [];
  let subtotal = 0;
  const qtyByProduct = new Map<
    string,
    { qty: number; title: string; stockQty: number | null }
  >();

  for (const raw of rawItems) {
    const product = await getProductByIdAsync(raw.productId);
    if (!product) {
      return { ok: false, message: "یکی از محصولات یافت نشد" };
    }
    if (!product.inStock) {
      return {
        ok: false,
        message: `محصول «${product.title}» ناموجود است`,
      };
    }

    const weight =
      product.weightOptions.find(
        (w) =>
          w.grams === raw.weight?.grams || w.label === raw.weight?.label,
      ) ?? null;

    if (!weight) {
      return {
        ok: false,
        message: `وزن انتخابی برای «${product.title}» نامعتبر است`,
      };
    }

    const requestedQty = Math.round(Number(raw.quantity) || 0);
    if (!Number.isFinite(requestedQty) || requestedQty < 1) {
      return { ok: false, message: "تعداد محصول نامعتبر است" };
    }
    if (requestedQty > 20) {
      return {
        ok: false,
        message: `حداکثر تعداد خرید برای «${product.title}» ۲۰ عدد است`,
      };
    }

    const catalogStock =
      typeof product.stockQty === "number" ? product.stockQty : null;
    const othersHeld =
      catalogStock == null
        ? 0
        : await getHeldQtyForProduct(product.id, opts?.holdSessionId ?? null);
    const stockQty =
      catalogStock == null ? null : Math.max(0, catalogStock - othersHeld);
    const prev = qtyByProduct.get(product.id);
    const aggregated = (prev?.qty ?? 0) + requestedQty;
    if (stockQty != null && aggregated > stockQty) {
      return {
        ok: false,
        message: `موجودی «${product.title}» کافی نیست (باقی‌مانده: ${stockQty})`,
      };
    }
    qtyByProduct.set(product.id, {
      qty: aggregated,
      title: product.title,
      stockQty,
    });

    const unitPrice = getEffectiveWeightPrice(product, weight);

    const coverImage = product.images[0] ?? "";

    items.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: coverImage,
      imageFit: imageFitForSrc(product.imageFits, coverImage),
      weight: {
        label: weight.label,
        grams: weight.grams,
        price: unitPrice,
      },
      quantity: requestedQty,
      sellerId: product.sellerId,
    });
    subtotal += unitPrice * requestedQty;
  }

  return { ok: true, items, subtotal };
}

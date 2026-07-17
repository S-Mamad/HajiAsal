import type { CartItem } from "@/types";
import { getEffectiveWeightPrice } from "@/lib/products";
import { getProductByIdAsync } from "./products-store";
import { getSiteSettings } from "./site-settings";

export type ShippingMethodId = "standard" | "express" | "pickup";

export async function calcShippingCost(
  method: string | undefined,
  _subtotal: number,
): Promise<number> {
  const settings = await getSiteSettings();
  const base = settings.shippingCost;
  if (method === "pickup") return 0;
  if (method === "express") {
    return base + 35000;
  }
  return base;
}

/**
 * Rebuild cart lines from catalog prices (never trust client prices).
 * Uses async product store so admin/seller stock & price overrides apply.
 */
export async function rebuildOrderItems(rawItems: CartItem[]): Promise<
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

    const quantity = Math.min(
      20,
      Math.max(1, Math.round(Number(raw.quantity) || 0)),
    );
    if (!Number.isFinite(quantity) || quantity < 1) {
      return { ok: false, message: "تعداد محصول نامعتبر است" };
    }

    const unitPrice = getEffectiveWeightPrice(product, weight);

    items.push({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      image: product.images[0] ?? "",
      weight: {
        label: weight.label,
        grams: weight.grams,
        price: unitPrice,
      },
      quantity,
    });
    subtotal += unitPrice * quantity;
  }

  return { ok: true, items, subtotal };
}

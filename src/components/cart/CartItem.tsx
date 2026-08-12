"use client";

import Link from "next/link";
import { Minus, Plus, Trash } from "@phosphor-icons/react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { ProductImage } from "@/components/ui/ProductImage";
import { maxPurchasableQty } from "@/lib/product-availability";

function otherWeightsQty(
  items: ReturnType<typeof useCartStore.getState>["items"],
  productId: string,
  weightGrams: number,
): number {
  return items.reduce((sum, i) => {
    if (i.productId !== productId || i.weight.grams === weightGrams) return sum;
    return sum + i.quantity;
  }, 0);
}

export function CartItemRow() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-secondary">
        سبد خرید شما خالی است
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3 sm:gap-4">
      {items.map((item) => {
        const oos = item.inStock === false;
        const maxQty = maxPurchasableQty({
          inStock: !oos,
          stockQty: item.stockQty,
        });
        const room =
          typeof item.stockQty === "number"
            ? Math.max(
                0,
                maxQty -
                  otherWeightsQty(items, item.productId, item.weight.grams),
              )
            : maxQty;
        const atMax = item.quantity >= room;

        return (
          <li
            key={`${item.productId}-${item.weight.grams}`}
            className={`flex gap-3 rounded-xl border p-2.5 sm:rounded-2xl sm:p-3 ${
              oos
                ? "border-red-400/40 bg-red-500/5"
                : "border-border bg-surface-elevated/40"
            }`}
          >
            <Link
              href={hajiasalPath(`/product/${item.slug}`)}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-20 sm:w-20"
            >
              <ProductImage
                src={item.image}
                alt={item.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={hajiasalPath(`/product/${item.slug}`)}
                    className="block truncate text-sm font-medium text-primary hover:text-gold"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-secondary">
                    {item.weight.label}
                    {oos ? (
                      <span className="ms-2 text-red-400">ناموجود</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId, item.weight.grams)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dim hover:bg-surface-muted hover:text-red-400"
                  aria-label="حذف"
                >
                  <Trash size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface px-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.weight.grams,
                        item.quantity - 1,
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary"
                    aria-label="کاهش"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm text-primary tabular-nums">
                    {item.quantity.toLocaleString("fa-IR")}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.productId,
                        item.weight.grams,
                        item.quantity + 1,
                      )
                    }
                    disabled={oos || atMax}
                    className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="افزایش"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gold tabular-nums">
                  {formatPrice(item.weight.price * item.quantity)}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import { Minus, Plus, Trash } from "@phosphor-icons/react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";

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
      {items.map((item) => (
        <li
          key={`${item.productId}-${item.weight.grams}`}
          className="flex gap-3 rounded-xl border border-border bg-surface-elevated/40 p-2.5 sm:border-0 sm:bg-transparent sm:p-0"
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted sm:h-20 sm:w-20">
            <ProductImage
              src={item.image}
              alt={item.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">
                  {item.title}
                </p>
                <p className="text-xs text-secondary">{item.weight.label}</p>
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
                  className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary"
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
      ))}
    </ul>
  );
}

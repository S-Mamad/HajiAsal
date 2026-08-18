"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { Minus, Plus, Trash, Warning } from "@phosphor-icons/react";
import { useCartStore } from "@/store/cart";
import { hajiasalPath } from "@/lib/paths";
import { PriceText } from "@/components/ui/PriceText";
import { ProductImage } from "@/components/ui/ProductImage";
import { catalogImageFit, catalogMediaClass } from "@/lib/product-image";
import { maxPurchasableQty } from "@/lib/product-availability";
import type { CartItem } from "@/types";

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

function CartLine({ item }: { item: CartItem }) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-120, -40, 0], [1, 0.4, 0]);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const oos =
    item.inStock === false || item.availability === "out_of_stock";
  const priceChanged = item.availability === "price_changed";
  const lowStock =
    !oos && typeof item.stockQty === "number" && item.stockQty > 0 && item.stockQty <= 2;
  const maxQty = maxPurchasableQty({
    inStock: !oos,
    stockQty: item.stockQty,
  });
  const room =
    typeof item.stockQty === "number"
      ? Math.max(
          0,
          maxQty - otherWeightsQty(items, item.productId, item.weight.grams),
        )
      : maxQty;
  const atMax = item.quantity >= room;

  const resetX = () => {
    void animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
  };

  return (
    <li className="relative overflow-hidden rounded-xl sm:rounded-2xl">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-red-500 text-white"
        aria-hidden
      >
        <Trash size={22} />
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.08}
        onDragStart={() => {
          setDragging(true);
          startX.current = x.get();
        }}
        onDragEnd={(_, info) => {
          setDragging(false);
          if (info.offset.x < -90 || info.velocity.x < -500) {
            removeItem(item.productId, item.weight.grams);
            return;
          }
          resetX();
        }}
        className={`relative flex gap-3 rounded-xl border p-2.5 sm:rounded-2xl sm:p-3 ${
          oos
            ? "border-border bg-surface-muted/80 opacity-60 grayscale"
            : "border-border bg-surface-elevated/40"
        } ${dragging ? "cursor-grabbing" : ""}`}
      >
        <Link
          href={hajiasalPath(`/product/${item.slug}`)}
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ${catalogMediaClass(item.image, item.imageFit)} sm:h-20 sm:w-20`}
          onClick={(e) => {
            if (Math.abs(x.get() - startX.current) > 8) e.preventDefault();
          }}
        >
          <ProductImage
            src={item.image}
            alt={item.title}
            fill
            fit={catalogImageFit(item.image, item.imageFit)}
            imageFit={item.imageFit}
            sizes="80px"
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
              <p className="mt-0.5 text-xs text-secondary">{item.weight.label}</p>
              {oos ? (
                <p className="mt-1 text-xs font-medium text-red-500">
                  متاسفانه موجودی تمام شد
                </p>
              ) : null}
              {priceChanged ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                  <Warning size={12} weight="fill" />
                  قیمت این کالا نسبت به قبل تغییر کرده است
                </p>
              ) : null}
              {lowStock ? (
                <p className="mt-1 text-xs font-medium text-red-500">
                  فقط {item.stockQty!.toLocaleString("fa-IR")} عدد در انبار باقی
                  مانده
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.productId, item.weight.grams)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dim hover:bg-surface-muted hover:text-red-400"
              aria-label="حذف"
            >
              <Trash size={16} />
            </button>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-surface px-0.5">
              <button
                type="button"
                onClick={() =>
                  updateQuantity(
                    item.productId,
                    item.weight.grams,
                    item.quantity - 1,
                  )
                }
                disabled={oos}
                className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary disabled:opacity-40 sm:h-9 sm:w-9"
                aria-label="کاهش"
              >
                <Minus size={16} />
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
                className="flex h-8 w-8 items-center justify-center text-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
                aria-label="افزایش"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="min-w-0 overflow-hidden text-end">
              <PriceText
                amount={item.weight.price * item.quantity}
                className="text-xs font-semibold text-gold sm:text-sm"
              />
            </p>
          </div>
        </div>
      </motion.div>
    </li>
  );
}

export function CartItemRow() {
  const items = useCartStore((s) => s.items);

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
        <CartLine
          key={`${item.productId}-${item.weight.grams}`}
          item={item}
        />
      ))}
    </ul>
  );
}

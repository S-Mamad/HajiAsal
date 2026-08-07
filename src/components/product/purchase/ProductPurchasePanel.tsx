"use client";

import Link from "next/link";
import {
  ShoppingBag,
  Minus,
  Plus,
  Check,
  Truck,
  Shield,
} from "@phosphor-icons/react";
import { WeightSelector } from "./WeightSelector";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { hajiasalPath } from "@/lib/paths";
import type { ProductPurchasePanelProps } from "../types";

export function ProductPurchasePanel({
  selectedWeight,
  onWeightChange,
  quantity,
  onQuantityChange,
  listPrice,
  salePrice,
  purchasable,
  maxQty,
  adding,
  addedFlash,
  onAddToCart,
  shippingLabel,
  trustTitle,
  product,
}: ProductPurchasePanelProps) {
  return (
    <div className="pdp-buy-panel flex flex-col gap-6 rounded-[1.25rem] border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-dim">قیمت انتخابی</span>
          <PriceDisplay
            price={listPrice}
            discountPrice={salePrice < listPrice ? salePrice : undefined}
            size="lg"
          />
        </div>
        {purchasable ? (
          <div className="inline-flex items-center gap-1.5 text-sm text-success">
            <Check size={15} weight="bold" />
            <span>موجود در انبار</span>
          </div>
        ) : (
          <div className="text-sm font-medium text-red-500">فعلاً موجود نیست</div>
        )}
      </div>

      <WeightSelector
        options={product.weightOptions}
        selected={selectedWeight}
        onChange={onWeightChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex h-14 items-center justify-between rounded-xl border border-border bg-surface-elevated px-1 sm:w-36 sm:justify-center">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={!purchasable}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface hover:text-primary active:scale-[0.98] disabled:opacity-40"
            aria-label="کاهش"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-[2rem] text-center text-base font-semibold tabular-nums text-primary">
            {quantity.toLocaleString("fa-IR")}
          </span>
          <button
            type="button"
            onClick={() =>
              onQuantityChange(Math.min(maxQty || 1, quantity + 1))
            }
            disabled={!purchasable || quantity >= maxQty}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface hover:text-primary active:scale-[0.98] disabled:opacity-40"
            aria-label="افزایش"
          >
            <Plus size={16} />
          </button>
        </div>

        <Button
          size="lg"
          disabled={!purchasable || adding}
          onClick={onAddToCart}
          className="h-14 w-full flex-1 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShoppingBag size={18} className="shrink-0" weight="bold" />
          <span className="truncate">
            {!purchasable
              ? "ناموجود"
              : adding
                ? "در حال بررسی..."
                : addedFlash
                  ? "به سبد اضافه شد"
                  : "افزودن به سبد"}
          </span>
        </Button>
      </div>

      <div className="grid gap-3 border-t border-border pt-4 text-[13px] text-secondary sm:grid-cols-2">
        <div className="flex items-start gap-2.5">
          <Truck size={16} className="mt-0.5 shrink-0 text-gold" weight="duotone" />
          <span>{shippingLabel}</span>
        </div>
        <Link
          href={hajiasalPath("/authenticity")}
          className="flex items-start gap-2.5 transition-colors hover:text-gold"
        >
          <Shield size={16} className="mt-0.5 shrink-0 text-gold" weight="duotone" />
          <span>{trustTitle}</span>
        </Link>
      </div>
    </div>
  );
}

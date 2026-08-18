"use client";

import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  interpolateAmountText,
  resolveCartPromo,
} from "@/lib/cart-promo";

export function FreeShippingBar() {
  const settings = useSiteSettings();
  const promo = resolveCartPromo(settings);
  const threshold = useCartStore(
    (s) => s.shippingConfig.freeShippingThreshold,
  );
  const payable = useCartStore((s) => s.getPayableSubtotal());

  if (
    !promo.freeShippingBarEnabled ||
    threshold <= 0 ||
    payable <= 0
  ) {
    return null;
  }

  const remaining = Math.max(0, threshold - payable);
  const qualified = remaining <= 0;
  const progress = Math.min(1, payable / threshold);
  const remainingLabel = formatPrice(remaining);

  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface-elevated/60 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs sm:text-sm">
        {qualified ? (
          <p className="font-medium text-success">
            {promo.freeShippingUnlockedText}
          </p>
        ) : (
          <p className="min-w-0 text-secondary">
            {interpolateAmountText(
              promo.freeShippingRemainingText,
              remainingLabel,
            )}
          </p>
        )}
        <span className="shrink-0 text-[11px] text-dim tabular-nums">
          {Math.round(progress * 100).toLocaleString("fa-IR")}٪
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{ width: `${Math.max(4, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

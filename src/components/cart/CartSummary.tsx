"use client";

import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

interface CartSummaryProps {
  showShipping?: boolean;
  shippingOverride?: number;
  discount?: number;
  feeLabel?: string;
  feeAmount?: number;
  /** When set, shown as the final payable total (e.g. SnappPay with fee). */
  payableOverride?: number;
}

export function CartSummary({
  showShipping = false,
  shippingOverride,
  discount = 0,
  feeLabel,
  feeAmount = 0,
  payableOverride,
}: CartSummaryProps) {
  // Payable only — OOS lines must not inflate checkout totals.
  const subtotal = useCartStore((s) => s.getPayableSubtotal());
  const storeShipping = useCartStore((s) => s.getShippingCost());
  const shipping = shippingOverride ?? storeShipping;
  const cashTotal = Math.max(
    0,
    subtotal + (showShipping ? shipping : 0) - discount,
  );
  const total =
    typeof payableOverride === "number" ? payableOverride : cashTotal;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between text-secondary">
        <span>جمع جزء</span>
        <span className="tabular-nums">{formatPrice(subtotal)}</span>
      </div>
      {showShipping && subtotal > 0 ? (
        <div className="flex justify-between text-secondary">
          <span>هزینه ارسال</span>
          <span className="tabular-nums">
            {shipping === 0 ? "بدون هزینه" : formatPrice(shipping)}
          </span>
        </div>
      ) : subtotal > 0 ? (
        <p className="text-xs text-secondary">
          هزینه ارسال بعد از ادامه خرید محاسبه می‌شود.
        </p>
      ) : null}
      {discount > 0 ? (
        <div className="flex justify-between text-gold">
          <span>تخفیف</span>
          <span className="tabular-nums">-{formatPrice(discount)}</span>
        </div>
      ) : null}
      {feeAmount > 0 && feeLabel ? (
        <div className="flex justify-between text-secondary">
          <span>{feeLabel}</span>
          <span className="tabular-nums">{formatPrice(feeAmount)}</span>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
        <span>مبلغ قابل پرداخت</span>
        <span className="text-gold tabular-nums">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

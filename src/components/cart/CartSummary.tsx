"use client";

import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cart";

interface CartSummaryProps {
  showShipping?: boolean;
  shippingOverride?: number;
  discount?: number;
}

export function CartSummary({
  showShipping = true,
  shippingOverride,
  discount = 0,
}: CartSummaryProps) {
  const subtotal = useCartStore((s) => s.getSubtotal());
  const storeShipping = useCartStore((s) => s.getShippingCost());
  const shipping = shippingOverride ?? storeShipping;
  const total = Math.max(0, subtotal + (showShipping ? shipping : 0) - discount);

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex justify-between text-secondary">
        <span>جمع جزء</span>
        <span className="tabular-nums">{formatPrice(subtotal)}</span>
      </div>
      {showShipping ? (
        <div className="flex justify-between text-secondary">
          <span>هزینه ارسال</span>
          <span className="tabular-nums">
            {shipping === 0 ? "بدون هزینه" : formatPrice(shipping)}
          </span>
        </div>
      ) : null}
      {discount > 0 ? (
        <div className="flex justify-between text-gold">
          <span>تخفیف</span>
          <span className="tabular-nums">-{formatPrice(discount)}</span>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
        <span>مجموع</span>
        <span className="text-gold tabular-nums">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

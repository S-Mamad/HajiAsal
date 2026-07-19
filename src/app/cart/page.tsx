"use client";

import { Button } from "@/components/ui/Button";
import { CartItemRow } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useCartStore } from "@/store/cart";

export default function CartPage() {
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasHydrated = useCartStore((s) => s._hasHydrated);

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-14">
        <SectionHeading title="سبد خرید" className="mb-8" />
        <p className="py-10 text-center text-sm text-secondary">
          در حال بارگذاری سبد...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-14">
      <SectionHeading title="سبد خرید" className="mb-8" />

      <div className="rounded-2xl border border-border bg-surface p-5 md:p-8">
        {itemCount > 0 ? (
          <>
            <CartItemRow />
            <div className="mt-8 flex flex-col gap-6 border-t border-border pt-6">
              <CartSummary />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href="/checkout" className="flex-1">
                  تکمیل خرید
                </Button>
                <Button href="/shop" variant="outline" className="flex-1">
                  ادامه خرید
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="mb-4 text-sm text-secondary">سبد خرید خالی است</p>
            <Button href="/shop">رفتن به فروشگاه</Button>
          </div>
        )}
      </div>
    </div>
  );
}

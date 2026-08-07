"use client";

import { ShoppingBag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CartItemRow } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCartStore } from "@/store/cart";
import { hajiasalPath } from "@/lib/paths";
import { formatPersianNumber, formatPrice } from "@/lib/utils";

export default function CartPage() {
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const total = useCartStore((s) => s.getTotal());

  if (!hasHydrated) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 md:px-8 md:py-14">
        <h1 className="mb-6 text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
          سبد خرید
        </h1>
        <div
          className="space-y-3"
          aria-busy="true"
          aria-label="در حال بارگذاری سبد"
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-surface-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 md:px-8 md:py-14">
      <header className="mb-6 flex shrink-0 items-end justify-between gap-3 sm:mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
            سبد خرید
          </h1>
          {itemCount > 0 ? (
            <p className="mt-1 text-sm text-secondary">
              {formatPersianNumber(itemCount)} کالا در سبد شماست
            </p>
          ) : null}
        </div>
        {itemCount > 0 ? (
          <span className="hidden items-center gap-1.5 rounded-full bg-gold-dim px-3 py-1 text-xs font-medium text-gold sm:inline-flex">
            <ShoppingBag size={14} weight="fill" />
            آماده پرداخت
          </span>
        ) : null}
      </header>

      {itemCount > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-start lg:gap-8">
          <section
            aria-label="اقلام سبد"
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 md:p-6"
          >
            <CartItemRow />
          </section>

          <aside className="hidden rounded-2xl border border-border bg-surface p-5 sm:sticky sm:top-24 sm:block">
            <h2 className="mb-4 text-sm font-semibold text-primary">
              خلاصه سفارش
            </h2>
            <CartSummary />
            <div className="mt-5 flex flex-col gap-2.5">
              <Button href={hajiasalPath("/checkout")} className="w-full">
                تکمیل خرید
              </Button>
              <Button
                href={hajiasalPath("/shop")}
                variant="outline"
                className="w-full"
              >
                ادامه خرید
              </Button>
            </div>
          </aside>

          {/* Mobile sticky checkout above floating bottom nav */}
          <div className="fixed inset-x-0 bottom-[var(--mobile-dock-clearance)] z-[111] border-t border-border bg-surface px-4 py-3 sm:hidden">
            <div className="mx-auto flex max-w-lg items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-secondary">مجموع</p>
                <p className="truncate text-sm font-bold text-gold tabular-nums">
                  {formatPrice(total)}
                </p>
              </div>
              <Button
                href={hajiasalPath("/checkout")}
                size="sm"
                className="shrink-0"
              >
                تکمیل خرید
              </Button>
            </div>
          </div>
          <div className="h-20 sm:hidden" aria-hidden />
        </div>
      ) : (
        <EmptyState
          className="my-auto"
          title="سبد خرید خالی است"
          description="محصولات مورد علاقه را از فروشگاه انتخاب کنید."
          action={
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          }
        />
      )}
    </div>
  );
}

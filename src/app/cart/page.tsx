"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShoppingBag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CartItemRow } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { CartImpulseBuys } from "@/components/cart/CartImpulseBuys";
import { EmptyState } from "@/components/ui/EmptyState";
import { CartSkeleton } from "@/components/ui/Skeleton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useCartStore } from "@/store/cart";
import { hajiasalPath } from "@/lib/paths";
import { formatPersianNumber, formatPrice } from "@/lib/utils";
import { useRegisterStickyBottomBar } from "@/hooks/useRegisterStickyBottomBar";

export default function CartPage() {
  const itemCount = useCartStore((s) => s.getItemCount());
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const payableSubtotal = useCartStore((s) => s.getPayableSubtotal());
  const cartTotal = useCartStore((s) => s.getPayableSubtotal());
  const items = useCartStore((s) => s.items);
  const applyRevalidate = useCartStore((s) => s.applyRevalidate);
  const removeItem = useCartStore((s) => s.removeItem);
  const appliedCouponCode = useCartStore((s) => s.appliedCouponCode);
  const canCheckout =
    payableSubtotal > 0 &&
    !items.some(
      (i) => i.availability === "out_of_stock" || i.inStock === false,
    );
  const hasUnavailable = items.some(
    (i) => i.availability === "out_of_stock" || i.inStock === false,
  );
  const payableItemCount = items.reduce((sum, item) => {
    if (item.availability === "out_of_stock" || item.inStock === false) {
      return sum;
    }
    return sum + item.quantity;
  }, 0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const revalidated = useRef(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  useRegisterStickyBottomBar(hasHydrated && itemCount > 0, stickyRef);
  const checkoutHref = appliedCouponCode
    ? `${hajiasalPath("/checkout")}?coupon=${encodeURIComponent(appliedCouponCode)}`
    : hajiasalPath("/checkout");

  const runRevalidate = useCallback(async () => {
    if (items.length === 0) return;
    try {
      const res = await fetch("/api/cart/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            weightGrams: i.weight.grams,
            quantity: i.quantity,
            currentPrice: i.priceAtAdd ?? i.weight.price,
          })),
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        items?: Array<{
          productId: string;
          weightGrams: number;
          availability: "ok" | "price_changed" | "out_of_stock";
          inStock: boolean;
          stockQty?: number;
          livePrice: number;
          title?: string;
          image?: string;
          sellerId?: string;
        }>;
      };
      if (res.ok && data.success && data.items) {
        applyRevalidate(data.items);
      }
    } catch {
      /* keep local cart */
    }
  }, [items, applyRevalidate]);

  useEffect(() => {
    if (!hasHydrated || revalidated.current || items.length === 0) return;
    revalidated.current = true;
    void runRevalidate();
  }, [hasHydrated, items.length, runRevalidate]);

  useEffect(() => {
    const btn = document.getElementById("cart-checkout-cta");
    if (!btn) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void import("next/router").catch(() => undefined);
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.href = checkoutHref;
          document.head.appendChild(link);
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(btn);
    return () => observer.disconnect();
  }, [checkoutHref, itemCount]);

  if (!hasHydrated) {
    return (
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col overflow-y-auto overscroll-y-contain px-4 py-8 sm:px-6 md:px-8 md:py-14">
        <h1 className="mb-6 text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
          سبد خرید
        </h1>
        <CartSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto flex min-h-full w-full min-w-0 max-w-3xl flex-col px-4 py-8 sm:px-6 md:px-8 md:py-14">
        <header className="mb-6 flex shrink-0 items-end justify-between gap-3 sm:mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
              سبد خرید
            </h1>
            {itemCount > 0 ? (
              <p className="mt-1 text-sm text-secondary">
                {hasUnavailable && payableItemCount === 0
                  ? `${formatPersianNumber(itemCount)} کالا ناموجود در سبد`
                  : hasUnavailable
                    ? `${formatPersianNumber(payableItemCount)} کالای قابل خرید از ${formatPersianNumber(itemCount)}`
                    : `${formatPersianNumber(itemCount)} کالا در سبد شماست`}
              </p>
            ) : null}
          </div>
          {canCheckout ? (
            <span className="hidden items-center gap-1.5 rounded-full bg-gold-dim px-3 py-1 text-xs font-medium text-gold sm:inline-flex">
              <ShoppingBag size={14} weight="fill" />
              آماده پرداخت
            </span>
          ) : null}
        </header>

        {itemCount > 0 ? (
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
            <div className="min-w-0 max-w-full">
              <FreeShippingBar />
              <section
                aria-label="اقلام سبد"
                className="min-w-0 overflow-x-clip rounded-2xl border border-border bg-surface p-4 sm:p-5 md:p-6"
              >
                <CartItemRow />
              </section>
              <CartImpulseBuys />
            </div>

            <aside className="hidden rounded-2xl border border-border bg-surface p-5 sm:sticky sm:top-24 sm:block">
              <h2 className="mb-4 text-sm font-semibold text-primary">
                خلاصه سفارش
              </h2>
              <CartSummary />
              <div className="mt-5 flex flex-col gap-2.5">
                {hasUnavailable ? (
                  <button
                    type="button"
                    onClick={() => {
                      for (const item of items) {
                        if (
                          item.availability === "out_of_stock" ||
                          item.inStock === false
                        ) {
                          removeItem(item.productId, item.weight.grams);
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm font-medium text-secondary transition hover:border-gold/30 hover:text-primary"
                  >
                    حذف کالاهای ناموجود
                  </button>
                ) : null}
                <div id="cart-checkout-cta">
                  {canCheckout ? (
                    <Button href={checkoutHref} className="w-full">
                      ادامه فرآیند خرید
                    </Button>
                  ) : (
                    <Button href={hajiasalPath("/shop")} className="w-full">
                      انتخاب کالای موجود
                    </Button>
                  )}
                </div>
                <Button
                  href={hajiasalPath("/shop")}
                  variant="outline"
                  className="w-full"
                >
                  ادامه خرید
                </Button>
              </div>
            </aside>
          </div>
        ) : (
          <EmptyState
            className="my-auto"
            title="سبد خرید خالی است"
            description="هنوز چیزی انتخاب نکرده‌اید. از پرفروش‌ترین‌ها شروع کنید یا به فروشگاه برگردید."
            action={
              <>
                <Button href={`${hajiasalPath("/shop")}?sort=popular`}>
                  مشاهده پرفروش‌ترین‌ها
                </Button>
                <Button href={hajiasalPath("/")} variant="outline">
                  بازگشت به صفحه اصلی
                </Button>
              </>
            }
          />
        )}
        </div>
      </div>

      {itemCount > 0 ? (
        <>
          <div
            ref={stickyRef}
            className="z-[111] shrink-0 border-t border-border bg-surface px-4 py-3 sm:hidden"
          >
            <div className="mx-auto flex w-full max-w-lg min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => setBreakdownOpen(true)}
              >
                <p className="text-[11px] text-secondary">مبلغ قابل پرداخت</p>
                <p className="truncate text-sm font-bold text-gold tabular-nums">
                  {formatPrice(cartTotal)}
                </p>
              </button>
              {canCheckout ? (
                <Button href={checkoutHref} size="sm" className="max-w-[55%] shrink-0 px-3">
                  ادامه خرید
                </Button>
              ) : hasUnavailable && payableItemCount > 0 ? (
                <Button
                  size="sm"
                  className="max-w-[55%] shrink-0 px-3"
                  onClick={() => {
                    for (const item of items) {
                      if (
                        item.availability === "out_of_stock" ||
                        item.inStock === false
                      ) {
                        removeItem(item.productId, item.weight.grams);
                      }
                    }
                  }}
                >
                  حذف ناموجودها
                </Button>
              ) : (
                <Button
                  href={hajiasalPath("/shop")}
                  size="sm"
                  className="max-w-[55%] shrink-0 px-3"
                >
                  کالای موجود
                </Button>
              )}
            </div>
          </div>

          <BottomSheet
            open={breakdownOpen}
            onClose={() => setBreakdownOpen(false)}
            title="جزئیات مبلغ"
          >
            <CartSummary />
          </BottomSheet>
        </>
      ) : null}
    </div>
  );
}

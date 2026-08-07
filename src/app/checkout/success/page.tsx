"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";
import { useCartStore } from "@/store/cart";

const PAID_STATUSES = new Set([
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const trackingCode = searchParams.get("tracking") ?? "";
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<"loading" | "ok" | "unpaid" | "error">(
    "loading",
  );
  const [resolvedTracking, setResolvedTracking] = useState(trackingCode);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/orders?id=${encodeURIComponent(orderId)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.order) {
          setState("error");
          return;
        }
        const status = String(data.order.status ?? "");
        if (data.order.trackingCode) {
          setResolvedTracking(String(data.order.trackingCode));
        }
        if (PAID_STATUSES.has(status)) {
          clearCart();
          setState("ok");
        } else {
          setState("unpaid");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-secondary">
        در حال تأیید سفارش...
      </div>
    );
  }

  if (state === "unpaid" || state === "error") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <WarningCircle size={32} weight="fill" className="text-gold" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-primary">
          {state === "unpaid" ? "پرداخت هنوز تأیید نشده" : "سفارش یافت نشد"}
        </h1>
        <p className="mb-8 text-secondary">
          {state === "unpaid"
            ? "اگر مبلغ از حساب شما کم شده، چند دقیقه صبر کنید یا از پیگیری سفارش استفاده کنید."
            : "لینک موفقیت نامعتبر است یا دسترسی به این سفارش مجاز نیست."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button href={hajiasalPath("/checkout")} variant="outline">
            بازگشت به تسویه
          </Button>
          <Button href={hajiasalPath("/track-order")}>پیگیری سفارش</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold-dim">
        <CheckCircle size={32} weight="fill" className="text-success" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-primary">
        سفارش شما ثبت شد
      </h1>
      <p className="mb-6 text-secondary">
        از خرید شما سپاسگزاریم. سفارش به زودی آماده و ارسال می‌شود.
      </p>
      <p className="mb-8 space-y-1 rounded-xl border border-white/6 bg-surface px-6 py-3 text-sm">
        <span className="block">
          <span className="text-secondary">شماره سفارش: </span>
          <span className="font-mono font-bold text-primary" dir="ltr">
            {orderId}
          </span>
        </span>
        {resolvedTracking ? (
          <span className="block">
            <span className="text-secondary">کد پیگیری: </span>
            <span className="font-mono font-bold text-gold" dir="ltr">
              {resolvedTracking}
            </span>
          </span>
        ) : null}
      </p>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row">
        {resolvedTracking ? (
          <Button href={hajiasalPath("/track-order")} variant="outline">
            پیگیری سفارش
          </Button>
        ) : null}
        <Button href={hajiasalPath("/shop")}>ادامه خرید</Button>
        <Button href={hajiasalPath("/")} variant="outline">
          بازگشت به خانه
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

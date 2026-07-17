"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "نامشخص";
  const trackingCode = searchParams.get("tracking") ?? "";

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
        {trackingCode ? (
          <span className="block">
            <span className="text-secondary">کد پیگیری: </span>
            <span className="font-mono font-bold text-gold" dir="ltr">
              {trackingCode}
            </span>
          </span>
        ) : null}
      </p>
      <div className="mb-8 flex flex-col gap-2 sm:flex-row">
        {trackingCode ? (
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

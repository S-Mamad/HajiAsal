"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaymentResultView } from "@/components/checkout/PaymentResultView";

function CancelledContent() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get("orderId") ?? searchParams.get("order") ?? undefined;
  return <PaymentResultView kind="cancelled" orderId={orderId} />;
}

export default function CheckoutCancelledPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <CancelledContent />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaymentResultView } from "@/components/checkout/PaymentResultView";

function FailedContent() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get("orderId") ?? searchParams.get("order") ?? undefined;
  return <PaymentResultView kind="failed" orderId={orderId} />;
}

export default function CheckoutFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <FailedContent />
    </Suspense>
  );
}

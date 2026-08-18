"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PaymentResultView } from "@/components/checkout/PaymentResultView";

function PendingContent() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get("orderId") ?? searchParams.get("order") ?? undefined;
  return <PaymentResultView kind="pending" orderId={orderId} />;
}

export default function CheckoutPendingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}

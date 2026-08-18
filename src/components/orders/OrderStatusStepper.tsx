"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: "confirmed", label: "ثبت سفارش" },
  { id: "processing", label: "پردازش" },
  { id: "shipped", label: "تحویل به پیک/پست" },
  { id: "delivered", label: "دریافت شده" },
] as const;

function stepIndex(status: string): number {
  switch (status) {
    case "confirmed":
    case "paid":
      return 0;
    case "processing":
      return 1;
    case "shipped":
      return 2;
    case "delivered":
      return 3;
    case "cancelled":
    case "refunded":
    case "pending_payment":
    case "pending":
      return -1;
    default:
      return 0;
  }
}

export function OrderStatusStepper({ status }: { status: string }) {
  const current = stepIndex(status);
  if (current < 0) {
    return (
      <p className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs text-secondary">
        وضعیت فعلی سفارش در مراحل ارسال قرار ندارد.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3" aria-label="مراحل سفارش">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.id} className="flex items-center gap-3">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done || active
                  ? "bg-gold text-ink-on-gold"
                  : "bg-surface-muted text-dim",
                active && "animate-pulse ring-2 ring-gold/40",
              )}
            >
              {(index + 1).toLocaleString("fa-IR")}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-semibold text-primary" : "text-secondary",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

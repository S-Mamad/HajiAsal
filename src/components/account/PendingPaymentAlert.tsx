"use client";

import Link from "next/link";
import { cn, formatPersianNumber } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

interface PendingPaymentAlertProps {
  count: number;
  /** Orders still within payment window */
  payableCount?: number;
  onOpen: () => void;
  className?: string;
}

export function PendingPaymentAlert({
  count,
  payableCount,
  onOpen,
  className,
}: PendingPaymentAlertProps) {
  if (count <= 0) return null;

  const canPay =
    typeof payableCount === "number" ? payableCount > 0 : true;
  const highlightCount =
    typeof payableCount === "number" && payableCount > 0
      ? payableCount
      : count;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-gold-dim px-3.5 py-3",
        className,
      )}
    >
      <p className="min-w-0 flex-1 text-[13px] leading-5 text-primary">
        {canPay ? (
          <>
            <span className="font-semibold tabular-nums">
              {formatPersianNumber(highlightCount)}
            </span>{" "}
            سفارش در انتظار پرداخت
          </>
        ) : (
          <>
            <span className="font-semibold tabular-nums">
              {formatPersianNumber(count)}
            </span>{" "}
            سفارش منقضی‌شده
          </>
        )}
      </p>
      {canPay ? (
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 text-[13px] font-semibold text-gold transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          پرداخت
        </button>
      ) : (
        <Link
          href={hajiasalPath("/account/orders")}
          className="shrink-0 text-[13px] font-semibold text-gold transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          مشاهده
        </Link>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { cn, formatPersianNumber } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import type { DashboardOrderCounts } from "@/components/account/dashboard-types";

type MatrixCell = {
  key: keyof DashboardOrderCounts;
  label: string;
  ariaLabel: string;
  href: string;
  live: boolean;
};

const CELLS: MatrixCell[] = [
  {
    key: "active",
    label: "جاری",
    ariaLabel: "جاری",
    href: hajiasalPath("/account/orders"),
    live: true,
  },
  {
    key: "pendingPayment",
    label: "پرداخت",
    ariaLabel: "در انتظار پرداخت",
    href: hajiasalPath("/account/orders"),
    live: true,
  },
  {
    key: "delivered",
    label: "تحویل",
    ariaLabel: "تحویل‌شده",
    href: hajiasalPath("/account/orders"),
    live: false,
  },
  {
    key: "cancelled",
    label: "لغو",
    ariaLabel: "لغو شده",
    href: hajiasalPath("/account/orders"),
    live: false,
  },
];

interface OrdersStatusMatrixProps {
  counts: DashboardOrderCounts;
  onPendingPress?: () => void;
  className?: string;
}

export function OrdersStatusMatrix({
  counts,
  onPendingPress,
  className,
}: OrdersStatusMatrixProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.35rem] border border-border bg-surface",
        className,
      )}
      aria-labelledby="account-orders-heading"
    >
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-1">
        <h2
          id="account-orders-heading"
          className="text-[15px] font-semibold tracking-tight text-primary"
        >
          سفارش‌ها
        </h2>
        <Link
          href={hajiasalPath("/account/orders")}
          className="text-[12.5px] font-medium text-gold transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45"
        >
          مشاهده همه
        </Link>
      </div>

      <ul className="m-0 grid list-none grid-cols-4 p-0">
        {CELLS.map((cell, index) => {
          const count = counts[cell.key];
          const pendingInteractive =
            cell.key === "pendingPayment" && count > 0 && onPendingPress;
          const emphasis = cell.live && count > 0;

          const inner = (
            <>
              <span
                className={cn(
                  "text-[1.35rem] font-semibold tabular-nums leading-none tracking-tight",
                  emphasis ? "text-gold" : "text-primary",
                )}
              >
                {formatPersianNumber(count)}
              </span>
              <span className="mt-1.5 text-[11px] leading-none text-secondary">
                {cell.label}
              </span>
            </>
          );

          const cellClass = cn(
            "flex min-h-[4.75rem] w-full flex-col items-center justify-center px-1 py-3.5",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
            index > 0 && "border-s border-border",
            emphasis && "bg-gold/[0.04]",
          );

          return (
            <li key={cell.key}>
              {pendingInteractive ? (
                <button
                  type="button"
                  onClick={onPendingPress}
                  aria-label={`${cell.ariaLabel}، ${formatPersianNumber(count)} سفارش`}
                  className={cn(cellClass, "text-center")}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  href={cell.href}
                  aria-label={`${cell.ariaLabel}، ${formatPersianNumber(count)} سفارش`}
                  className={cellClass}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

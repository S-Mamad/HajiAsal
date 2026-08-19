"use client";

import Link from "next/link";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  type Icon,
} from "@phosphor-icons/react";
import { cn, formatPersianNumber } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import type { DashboardOrderCounts } from "@/components/account/dashboard-types";

type MatrixCell = {
  key: keyof DashboardOrderCounts;
  label: string;
  ariaLabel: string;
  href: string;
  live: boolean;
  icon: Icon;
};

const CELLS: MatrixCell[] = [
  {
    key: "active",
    label: "جاری",
    ariaLabel: "جاری",
    href: hajiasalPath("/account/orders"),
    live: true,
    icon: Package,
  },
  {
    key: "pendingPayment",
    label: "پرداخت",
    ariaLabel: "در انتظار پرداخت",
    href: hajiasalPath("/account/orders"),
    live: true,
    icon: Clock,
  },
  {
    key: "delivered",
    label: "تحویل",
    ariaLabel: "تحویل‌شده",
    href: hajiasalPath("/account/orders"),
    live: false,
    icon: CheckCircle,
  },
  {
    key: "cancelled",
    label: "لغو",
    ariaLabel: "لغو شده",
    href: hajiasalPath("/account/orders"),
    live: false,
    icon: XCircle,
  },
];

interface OrdersStatusMatrixProps {
  counts: DashboardOrderCounts;
  onPendingPress?: () => void;
  className?: string;
  showEmptyHint?: boolean;
}

export function OrdersStatusMatrix({
  counts,
  onPendingPress,
  className,
  showEmptyHint = false,
}: OrdersStatusMatrixProps) {
  return (
    <section
      className={cn(
        "account-stat overflow-hidden rounded-2xl border border-border/80 bg-surface",
        className,
      )}
      aria-labelledby="account-orders-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <h2
          id="account-orders-heading"
          className="text-[15px] font-semibold tracking-tight text-primary"
        >
          سفارش‌ها
        </h2>
        <Link
          href={hajiasalPath("/account/orders")}
          className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-gold transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45"
        >
          مشاهده همه
          <ArrowLeft size={13} weight="bold" aria-hidden />
        </Link>
      </div>

      <ul className="m-0 grid list-none grid-cols-4 divide-x divide-border/70 p-0">
        {CELLS.map((cell) => {
          const count = counts[cell.key];
          const pendingInteractive =
            cell.key === "pendingPayment" && count > 0 && onPendingPress;
          const emphasis = cell.live && count > 0;

          const inner = (
            <>
              <span
                className={cn(
                  "text-[1.5rem] font-semibold tabular-nums leading-none tracking-tight",
                  emphasis ? "text-gold" : "text-primary",
                )}
              >
                {formatPersianNumber(count)}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-secondary">
                <cell.icon
                  size={12}
                  weight={emphasis ? "fill" : "regular"}
                  className={emphasis ? "text-gold" : "text-dim"}
                  aria-hidden
                />
                {cell.label}
              </span>
            </>
          );

          const cellClass = cn(
            "flex w-full flex-col items-center justify-center px-2 py-4",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
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

      {showEmptyHint ? (
        <div className="border-t border-border/70 px-4 py-3.5">
          <p className="text-center text-[13px] leading-6 text-secondary">
            هنوز سفارشی ثبت نشده.{" "}
            <Link
              href={hajiasalPath("/shop")}
              className="inline-flex items-center gap-1 font-semibold text-gold transition hover:text-primary"
            >
              رفتن به فروشگاه
              <ArrowLeft size={13} weight="bold" aria-hidden />
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}

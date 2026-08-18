"use client";

import { useEffect, useState } from "react";
import { Clock } from "@phosphor-icons/react";
import { cn, formatPersianNumber } from "@/lib/utils";
import { PENDING_ORDER_TTL_MS } from "@/lib/order-pending";

function pad2(n: number): string {
  return formatPersianNumber(n).padStart(2, "۰");
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  // Under one hour: MM:SS reads clearer than 00:MM:SS.
  if (h === 0) return `${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function remainingMs(createdAt: string, now: number): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return created + PENDING_ORDER_TTL_MS - now;
}

interface OrderExpiryPillProps {
  createdAt: string;
  className?: string;
}

export function OrderExpiryPill({ createdAt, className }: OrderExpiryPillProps) {
  const [now, setNow] = useState(() => Date.now());
  const left = remainingMs(createdAt, now);
  const urgent = left > 0 && left <= 5 * 60 * 1000;
  const expired = left <= 0;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700",
        "dark:bg-red-500/15 dark:text-red-300",
        className,
      )}
    >
      <Clock
        size={12}
        weight="bold"
        className={cn(urgent && !expired && "animate-pulse")}
        aria-hidden
      />
      {expired
        ? "مهلت پرداخت تمام شده"
        : `انقضای سفارش: ${formatRemaining(left)}`}
    </span>
  );
}

export function isPendingOrderExpired(createdAt: string, now = Date.now()): boolean {
  return remainingMs(createdAt, now) <= 0;
}

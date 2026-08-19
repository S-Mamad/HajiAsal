"use client";

import { useEffect, useState } from "react";
import { FramedProductImage } from "@/components/product/media/FramedProductImage";
import { PayButton } from "@/components/account/PayButton";
import {
  OrderExpiryPill,
  isPendingOrderExpired,
} from "@/components/account/OrderExpiryPill";
import type { DashboardPendingOrder } from "@/components/account/dashboard-types";
import {
  cn,
  formatJalaliDate,
  formatPersianNumber,
  formatPrice,
} from "@/lib/utils";

interface PendingOrderPayCardProps {
  order: DashboardPendingOrder;
  onHandoffStart?: () => void;
  onHandoffEnd?: () => void;
  className?: string;
}

export function PendingOrderPayCard({
  order,
  onHandoffStart,
  onHandoffEnd,
  className,
}: PendingOrderPayCardProps) {
  const [expired, setExpired] = useState(() =>
    isPendingOrderExpired(order.createdAt),
  );
  const [payError, setPayError] = useState<string | null>(null);
  const preview = order.items.slice(0, 3);
  const extra = Math.max(0, order.items.length - preview.length);

  useEffect(() => {
    if (expired) return;
    const id = window.setInterval(() => {
      if (isPendingOrderExpired(order.createdAt)) {
        setExpired(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [expired, order.createdAt]);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-surface p-4",
        "dark:border-border/80 dark:bg-surface-elevated/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-primary">
          {formatJalaliDate(order.createdAt)}
        </p>
        <p
          className="shrink-0 font-mono text-[11px] tracking-tight text-secondary"
          dir="ltr"
        >
          {order.id}
        </p>
      </div>

      {preview.length > 0 ? (
        <div className="mt-4 flex items-center">
          <div className="flex -space-x-2.5 space-x-reverse">
            {preview.map((item) => (
              <div
                key={`${item.productId}-${item.weightGrams}`}
                className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-surface bg-surface-muted ring-1 ring-border"
                title={item.title}
              >
                <FramedProductImage
                  src={item.image}
                  alt={item.title}
                  imageFit={item.imageFit}
                  sizes="36px"
                  aspectClassName="relative h-full w-full overflow-hidden"
                  className="h-full w-full rounded-full"
                />
              </div>
            ))}
            {extra > 0 ? (
              <div className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-surface-muted text-[10px] font-semibold tabular-nums text-secondary ring-1 ring-border">
                +{formatPersianNumber(extra)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-secondary">مبلغ قابل پرداخت</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-primary">
            {formatPrice(order.total)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <OrderExpiryPill createdAt={order.createdAt} className="self-end" />
          {expired ? (
            <span className="inline-flex h-11 items-center rounded-full bg-surface-muted px-4 text-xs font-medium text-secondary">
              منقضی شده
            </span>
          ) : (
            <PayButton
              orderId={order.id}
              onHandoffStart={onHandoffStart}
              onHandoffEnd={onHandoffEnd}
              onError={(message) => {
                setPayError(message);
                onHandoffEnd?.();
              }}
            />
          )}
        </div>
      </div>
      {payError ? (
        <p className="mt-3 text-[12px] leading-5 text-red-600" role="alert">
          {payError}
        </p>
      ) : null}
    </article>
  );
}

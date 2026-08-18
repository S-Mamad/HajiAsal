"use client";

import { useEffect, useRef, useState } from "react";
import { X, ShieldCheck } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PendingOrderPayCard } from "@/components/account/PendingOrderPayCard";
import type { DashboardPendingOrder } from "@/components/account/dashboard-types";
import { isPendingOrderExpired } from "@/components/account/OrderExpiryPill";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/ui/haptic";

interface PendingPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  orders: DashboardPendingOrder[];
}

export function PendingPaymentSheet({
  open,
  onClose,
  orders,
}: PendingPaymentSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [headerShadow, setHeaderShadow] = useState(false);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    if (!open) {
      setHandoff(false);
      setHeaderShadow(false);
      return;
    }
    hapticLight();
  }, [open]);

  useEffect(() => {
    if (!handoff) return;
    // Safety: never leave the sheet permanently locked.
    const id = window.setTimeout(() => setHandoff(false), 20_000);
    return () => window.clearTimeout(id);
  }, [handoff]);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const scroller = root?.parentElement;
    if (!scroller) return;
    const onScroll = () => setHeaderShadow(scroller.scrollTop > 4);
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [open]);

  const hasPayable = orders.some((o) => !isPendingOrderExpired(o.createdAt));
  const sheetTitle = hasPayable
    ? "سفارش‌های نیازمند پرداخت"
    : "سفارش‌های منقضی‌شده";

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      aboveDock={false}
      flush
      hideHeader
      showHandle
      className="rounded-t-[32px] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-0"
      overlayClassName="!bg-black/40 !backdrop-blur-sm"
      bodyClassName="relative"
    >
      <div ref={rootRef}>
        <div
          className={cn(
            "sticky top-0 z-10 flex items-center gap-3 bg-surface px-4 pb-3 pt-1 transition-shadow duration-200",
            headerShadow && "shadow-[0_8px_24px_-12px_rgba(0,0,0,0.28)]",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-secondary transition-colors hover:text-primary"
            aria-label="بستن"
          >
            <X size={18} weight="bold" />
          </button>
          <p className="min-w-0 flex-1 text-center text-[18px] font-medium text-primary">
            {sheetTitle}
          </p>
          <span className="h-11 w-11 shrink-0" aria-hidden />
        </div>

        <div className="space-y-3 px-4 pb-[calc(var(--mobile-dock-clearance,4rem)+1.5rem)] lg:pb-6">
          {orders.length === 0 ? (
            <p className="py-10 text-center text-sm text-secondary">
              سفارش در انتظار پرداختی ندارید.
            </p>
          ) : (
            orders.map((order) => (
              <PendingOrderPayCard
                key={order.id}
                order={order}
                onHandoffStart={() => setHandoff(true)}
                onHandoffEnd={() => setHandoff(false)}
              />
            ))
          )}
        </div>

        {handoff ? (
          <div
            className="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-3 bg-surface/85 backdrop-blur-[2px] sm:absolute sm:inset-0 sm:rounded-2xl"
            role="status"
            aria-live="polite"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-dim text-gold">
              <ShieldCheck size={28} weight="duotone" aria-hidden />
            </span>
            <p className="text-sm font-medium text-primary">
              در حال انتقال به صفحه پرداخت...
            </p>
            <p className="max-w-[240px] text-center text-xs leading-relaxed text-secondary">
              سفارش شما محفوظ است؛ لطفاً چند لحظه صبر کنید.
            </p>
          </div>
        ) : null}
      </div>
    </BottomSheet>
  );
}

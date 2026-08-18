"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { CartSummary } from "@/components/cart/CartSummary";
import { AnimatedTotal } from "@/components/checkout/AnimatedTotal";
import { useRegisterStickyBottomBar } from "@/hooks/useRegisterStickyBottomBar";
import { cn } from "@/lib/utils";

interface CheckoutStickyFooterProps {
  total: number;
  onPay: () => void;
  disabled?: boolean;
  loading?: boolean;
  shippingOverride?: number;
  discount?: number;
  feeLabel?: string;
  feeAmount?: number;
  payableOverride?: number;
  breakdownOpen: boolean;
  onBreakdownOpenChange: (open: boolean) => void;
  shakeKey?: number;
}

export function CheckoutStickyFooter({
  total,
  onPay,
  disabled,
  loading,
  shippingOverride,
  discount = 0,
  feeLabel,
  feeAmount = 0,
  payableOverride,
  breakdownOpen,
  onBreakdownOpenChange,
  shakeKey = 0,
}: CheckoutStickyFooterProps) {
  const barRef = useRef<HTMLDivElement>(null);
  useRegisterStickyBottomBar(true, barRef);

  return (
    <>
      <div
        ref={barRef}
        className="z-[111] shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <button
            type="button"
            className="flex items-center justify-between text-start"
            onClick={() => onBreakdownOpenChange(true)}
          >
            <span className="text-[11px] text-secondary">جمع قابل پرداخت</span>
            <AnimatedTotal
              value={total}
              className="text-sm font-bold text-gold tabular-nums"
            />
          </button>

          <motion.div
            animate={shakeKey > 0 ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              type="button"
              className={cn(
                "w-full transition",
                loading && "scale-[0.98] opacity-70",
              )}
              disabled={disabled || loading}
              onClick={onPay}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <CircleNotch size={18} className="animate-spin" />
                  در حال پردازش...
                </span>
              ) : (
                "تایید و پرداخت"
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      <BottomSheet
        open={breakdownOpen}
        onClose={() => onBreakdownOpenChange(false)}
        title="شفافیت هزینه‌ها"
        aboveDock={false}
      >
        <CartSummary
          showShipping
          shippingOverride={shippingOverride}
          discount={discount}
          feeLabel={feeLabel}
          feeAmount={feeAmount}
          payableOverride={payableOverride ?? total}
        />
      </BottomSheet>
    </>
  );
}

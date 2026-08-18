"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { motion } from "motion/react";
import { Package, Lightning, Storefront, Check } from "@phosphor-icons/react";
import { cn, formatPrice } from "@/lib/utils";

export type ShippingMethod = "standard" | "express" | "pickup";

export interface ShippingOption {
  id: ShippingMethod;
  label: string;
  description: string;
  cost: number;
  eta: string;
  recommended?: boolean;
}

export interface ShippingMethodSelectorHandle {
  shake: () => void;
  scrollIntoView: () => void;
}

interface ShippingMethodSelectorProps {
  options: ShippingOption[];
  value: ShippingMethod | null;
  onChange: (method: ShippingMethod) => void;
}

const icons: Record<ShippingMethod, typeof Package> = {
  standard: Package,
  express: Lightning,
  pickup: Storefront,
};

export const ShippingMethodSelector = forwardRef<
  ShippingMethodSelectorHandle,
  ShippingMethodSelectorProps
>(function ShippingMethodSelector({ options, value, onChange }, ref) {
  const [shakeToken, setShakeToken] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      shake: () => setShakeToken((k) => k + 1),
      scrollIntoView: () => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      },
    }),
    [],
  );

  return (
    <motion.div
      ref={rootRef}
      animate={shakeToken > 0 ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex scroll-mt-24 flex-col gap-2 scroll-mb-[var(--sticky-bottom-bar-h,11rem)]"
    >
      <p className="text-[13px] font-semibold text-primary">
        چطور می‌خواهید تحویل بگیرید؟
      </p>
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const Icon = icons[option.id];
          const selected = value === option.id;
          const recommended = Boolean(option.recommended);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-colors",
                selected
                  ? "border-gold/70 bg-gold-dim/35"
                  : "border-border bg-surface hover:border-border-bright",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  selected
                    ? "bg-gold text-ink-on-gold"
                    : option.id === "express"
                      ? "bg-gold-dim text-gold"
                      : "bg-surface-muted text-secondary",
                )}
              >
                <Icon size={16} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="text-[13.5px] font-semibold leading-snug text-primary">
                    {option.label}
                  </span>
                  {recommended ? (
                    <span className="rounded-full bg-gold px-1.5 py-px text-[9px] font-bold text-ink-on-gold">
                      پیشنهاد ما
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-secondary">
                  {option.eta}
                  {option.description ? ` · ${option.description}` : ""}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {selected ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold text-ink-on-gold">
                    <Check size={10} weight="bold" />
                  </span>
                ) : (
                  <span className="h-4 w-4 rounded-full border border-border-bright" />
                )}
                <span className="text-[12px] font-semibold tabular-nums text-gold">
                  {option.cost === 0 ? "رایگان" : formatPrice(option.cost)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
});

"use client";

import { cn, formatPrice } from "@/lib/utils";
import type { WeightSelectorProps } from "../types";

export function WeightSelector({
  options,
  selected,
  onChange,
  getPrice,
}: WeightSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-primary">انتخاب وزن</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const displayPrice = getPrice ? getPrice(option) : option.price;
          const listPrice = option.price;
          const onSale = displayPrice < listPrice;
          return (
            <button
              key={option.grams}
              type="button"
              onClick={() => onChange(option)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm transition-all duration-300 active:scale-[0.98]",
                selected.grams === option.grams
                  ? "border-gold bg-gold-dim font-medium text-gold"
                  : "border-border bg-surface-elevated text-secondary hover:border-border-bright",
              )}
            >
              <span className="block">{option.label}</span>
              <span className="mt-0.5 block text-xs opacity-80 tabular-nums">
                {formatPrice(displayPrice)}
                {onSale ? (
                  <span className="ms-1 line-through opacity-60">
                    {formatPrice(listPrice)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { cn, formatPrice } from "@/lib/utils";
import type { WeightSelectorProps } from "../types";

/**
 * Variant picker for weight/size.
 * Hidden when there is only one option (no choice to make).
 * Per-option price is shown only when prices actually differ —
 * the main PriceDisplay on the PDP already owns the selected price.
 */
export function WeightSelector({
  options,
  selected,
  onChange,
  getPrice,
  disabled = false,
}: WeightSelectorProps) {
  if (options.length <= 1) return null;

  const priced = options.map((option) => ({
    option,
    displayPrice: getPrice ? getPrice(option) : option.price,
    listPrice: option.price,
  }));
  const prices = priced.map((p) => p.displayPrice);
  const showPrices = new Set(prices).size > 1;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium leading-none text-primary">
        انتخاب وزن
      </p>
      <div className="flex flex-wrap gap-2" role="listbox" aria-label="انتخاب وزن">
        {priced.map(({ option, displayPrice, listPrice }) => {
          const onSale = displayPrice < listPrice;
          const isSelected = selected.grams === option.grams;
          return (
            <button
              key={option.grams}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={disabled}
              aria-disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange(option);
              }}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm transition-all duration-300 active:scale-[0.98]",
                disabled && "cursor-not-allowed opacity-45",
                isSelected
                  ? "border-gold bg-gold-dim font-medium text-gold"
                  : "border-border bg-surface-elevated text-secondary hover:border-border-bright",
              )}
            >
              <span className="block">{option.label}</span>
              {showPrices ? (
                <span className="mt-0.5 block text-xs opacity-80 tabular-nums">
                  {formatPrice(displayPrice)}
                  {onSale ? (
                    <span className="ms-1 line-through opacity-60">
                      {formatPrice(listPrice)}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

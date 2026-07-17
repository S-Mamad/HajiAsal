"use client";

import type { WeightOption } from "@/types";
import { cn, formatPrice } from "@/lib/utils";

interface WeightSelectorProps {
  options: WeightOption[];
  selected: WeightOption;
  onChange: (option: WeightOption) => void;
}

export function WeightSelector({
  options,
  selected,
  onChange,
}: WeightSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-primary">انتخاب وزن</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.grams}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm transition-all duration-300",
              selected.grams === option.grams
                ? "border-gold bg-gold-dim font-medium text-gold"
                : "border-border bg-surface-elevated text-secondary hover:border-border-bright",
            )}
          >
            <span className="block">{option.label}</span>
            <span className="mt-0.5 block text-xs opacity-80">
              {formatPrice(option.price)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

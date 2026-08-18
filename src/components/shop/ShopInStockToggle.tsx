"use client";

import { Check } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

interface ShopInStockToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ShopInStockToggle({ checked, onChange }: ShopInStockToggleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35",
        checked
          ? "border-gold/50 bg-gold-dim/40"
          : "border-border bg-white hover:border-gold/35",
      )}
    >
      <span
        className={cn(
          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition",
          checked
            ? "border-gold bg-gold text-ink-on-gold"
            : "border-border-bright bg-white",
        )}
        aria-hidden
      >
        {checked ? <Icon icon={Check} size={11} weight="bold" /> : null}
      </span>
      <span className="text-[13px] text-primary">فقط موجود</span>
    </button>
  );
}

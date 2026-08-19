"use client";

import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ShopFilterChipProps {
  label: ReactNode;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  onClear?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function ShopFilterChip({
  label,
  icon,
  active = false,
  onClick,
  onClear,
  ariaLabel,
  className,
}: ShopFilterChipProps) {
  const clearable = Boolean(onClear);

  return (
    <span
      className={cn(
        "inline-flex max-w-[min(100%,14rem)] shrink-0 items-center rounded-full border text-[13px] leading-none transition-colors",
        active
          ? "border-gold/55 bg-gold/[0.05] text-gold"
          : "border-border bg-surface text-primary hover:border-gold/30 hover:bg-surface-elevated/80",
        className,
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 py-2 ps-3",
          clearable ? "pe-1.5" : "pe-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/40",
        )}
      >
        {icon ? (
          <span className="inline-flex shrink-0 text-current opacity-90">{icon}</span>
        ) : null}
        <span className="truncate font-medium">{label}</span>
      </button>
      {clearable ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClear?.();
          }}
          aria-label={`حذف ${typeof label === "string" ? label : "فیلتر"}`}
          className={cn(
            "me-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
            "text-current/70 transition hover:bg-gold/10 hover:text-gold",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
          )}
        >
          <X size={11} weight="bold" aria-hidden />
        </button>
      ) : null}
    </span>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CaretDown, Check, SortAscending } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { ShopFilterChip } from "@/components/shop/ShopFilterChip";
import { SHOP_SORT_OPTIONS, shopSortLabel } from "@/lib/shop-catalog";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/types";

interface ShopSortMenuProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  variant?: "panel" | "chip";
}

export function ShopSortMenu({
  value,
  onChange,
  variant = "panel",
}: ShopSortMenuProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const listbox = open ? (
    <ul
      id={listId}
      role="listbox"
      aria-label="مرتب‌سازی"
      className={cn(
        "z-[130] overflow-hidden rounded-2xl border border-border bg-surface py-1 shadow-[0_16px_40px_-20px_rgb(28_25_23/0.55)]",
        variant === "chip"
          ? "absolute end-0 top-[calc(100%+0.35rem)] min-w-[11rem]"
          : "mt-1.5",
      )}
    >
      {SHOP_SORT_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-[13px] transition",
                selected
                  ? "bg-gold-dim font-medium text-gold"
                  : "text-primary hover:bg-surface-muted",
              )}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
              {selected ? (
                <Icon icon={Check} size={14} weight="bold" className="text-gold" />
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  if (variant === "chip") {
    return (
      <div ref={rootRef} className="relative shrink-0">
        <ShopFilterChip
          label="مرتب‌سازی"
          icon={<SortAscending size={15} weight="regular" aria-hidden />}
          active={open || value !== "popular"}
          onClick={() => setOpen((v) => !v)}
          ariaLabel={`مرتب‌سازی: ${shopSortLabel(value)}`}
        />
        {listbox}
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      <p className="mb-2 text-[13px] font-medium text-secondary">مرتب‌سازی</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="مرتب‌سازی"
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-start text-[13px] text-primary transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35",
          open ? "border-gold/45" : "border-border hover:border-gold/35",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{shopSortLabel(value)}</span>
        <Icon
          icon={CaretDown}
          size={14}
          className={cn(
            "shrink-0 text-dim transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {listbox}
    </div>
  );
}

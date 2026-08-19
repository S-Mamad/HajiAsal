"use client";

import { Check, SortAscending, Tag, CurrencyCircleDollar, Package } from "@phosphor-icons/react";
import { ShopFilterChip } from "@/components/shop/ShopFilterChip";
import { shopSortLabel } from "@/lib/shop-catalog";
import { cn, formatPrice } from "@/lib/utils";
import type { ProductCategory, SortOption } from "@/types";
import type { ShopCategoryChip } from "@/components/shop/ShopContent";

export type ShopFilterSheetId = "sort" | "category" | "price";

interface ShopFilterBarProps {
  sort: SortOption;
  category: ProductCategory | null;
  inStockOnly: boolean;
  maxPriceParam: string | null;
  searchQuery?: string;
  categories: ShopCategoryChip[];
  onOpenSheet: (sheet: ShopFilterSheetId) => void;
  updateParams: (updates: Record<string, string | null>) => void;
  className?: string;
}

export function ShopFilterBar({
  sort,
  category,
  inStockOnly,
  maxPriceParam,
  searchQuery,
  categories,
  onOpenSheet,
  updateParams,
  className,
}: ShopFilterBarProps) {
  const categoryLabel = category
    ? categories.find((c) => c.id === category)?.label ?? category
    : null;
  const sortActive = sort !== "popular";
  const sortChipLabel = sortActive ? shopSortLabel(sort) : "مرتب‌سازی";

  return (
    <div
      className={cn(
        "flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="toolbar"
      aria-label="فیلترهای فروشگاه"
    >
      {searchQuery ? (
        <ShopFilterChip
          label={`«${searchQuery}»`}
          active
          onClear={() => updateParams({ q: null, search: null })}
          ariaLabel={`جستجو: ${searchQuery}`}
        />
      ) : null}

      <ShopFilterChip
        label={sortChipLabel}
        icon={<SortAscending size={15} weight="regular" aria-hidden />}
        active={sortActive}
        onClick={() => onOpenSheet("sort")}
        onClear={
          sortActive
            ? () => updateParams({ sort: null })
            : undefined
        }
        ariaLabel={
          sortActive
            ? `مرتب‌سازی: ${shopSortLabel(sort)}`
            : "مرتب‌سازی"
        }
      />

      <ShopFilterChip
        label={categoryLabel ?? "دسته"}
        icon={<Tag size={15} weight="regular" aria-hidden />}
        active={Boolean(category)}
        onClick={() => onOpenSheet("category")}
        onClear={
          category ? () => updateParams({ category: null }) : undefined
        }
        ariaLabel={
          categoryLabel ? `دسته: ${categoryLabel}` : "انتخاب دسته‌بندی"
        }
      />

      <ShopFilterChip
        label={
          maxPriceParam
            ? `تا ${formatPrice(Number(maxPriceParam))}`
            : "قیمت"
        }
        icon={<CurrencyCircleDollar size={15} weight="regular" aria-hidden />}
        active={Boolean(maxPriceParam)}
        onClick={() => onOpenSheet("price")}
        onClear={
          maxPriceParam ? () => updateParams({ maxPrice: null }) : undefined
        }
        ariaLabel="محدوده قیمت"
      />

      <ShopFilterChip
        label="فقط موجود"
        icon={<Package size={15} weight="regular" aria-hidden />}
        active={inStockOnly}
        onClick={() =>
          updateParams({ inStock: inStockOnly ? null : "1" })
        }
        ariaLabel={
          inStockOnly ? "فقط موجود، فعال" : "فقط موجود"
        }
      />
    </div>
  );
}

/** Minimal list rows inside a bottom sheet (sort / category). */
export function ShopFilterOptionList({
  options,
  value,
  onSelect,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <li key={option.value}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelect(option.value)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-start text-[14px] transition",
                selected
                  ? "bg-gold-dim font-medium text-gold"
                  : "text-primary hover:bg-surface-muted",
              )}
            >
              {option.label}
              {selected ? (
                <Check size={16} weight="bold" className="shrink-0 text-gold" />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ShopPriceSheetBody({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (next: number) => void;
}) {
  const sliderMax = Math.max(max, min);
  const sliderValue = Math.min(Math.max(value, min), sliderMax);

  return (
    <div className="space-y-3 py-1">
      <p className="text-center text-sm tabular-nums text-secondary">
        تا{" "}
        <span className="font-semibold text-primary">
          {sliderValue.toLocaleString("fa-IR")} تومان
        </span>
      </p>
      <input
        type="range"
        min={min}
        max={sliderMax}
        step={50000}
        value={sliderValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--gold)]"
        aria-label="حداکثر قیمت"
      />
    </div>
  );
}

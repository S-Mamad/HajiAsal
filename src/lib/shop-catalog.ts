import type { SortOption } from "@/types";

export const SHOP_PAGE_SIZE = 20;

export const SHOP_SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "محبوب‌ترین" },
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
  { value: "newest", label: "جدیدترین" },
];

const SORT_VALUES = new Set<string>(
  SHOP_SORT_OPTIONS.map((option) => option.value),
);

export function isSortOption(value: string | null | undefined): value is SortOption {
  return Boolean(value && SORT_VALUES.has(value));
}

export function parseSortOption(value: string | null | undefined): SortOption {
  return isSortOption(value) ? value : "popular";
}

export function shopSortLabel(value: SortOption): string {
  return (
    SHOP_SORT_OPTIONS.find((option) => option.value === value)?.label ??
    "محبوب‌ترین"
  );
}

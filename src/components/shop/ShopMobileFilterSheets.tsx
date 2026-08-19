"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import {
  ShopFilterOptionList,
  ShopPriceSheetBody,
  type ShopFilterSheetId,
} from "@/components/shop/ShopFilterBar";
import { SHOP_SORT_OPTIONS } from "@/lib/shop-catalog";
import type { ProductCategory, SortOption } from "@/types";
import type { ShopCategoryChip } from "@/components/shop/ShopContent";
import { useCallback, useEffect, useState } from "react";

interface ShopMobileFilterSheetsProps {
  sheet: ShopFilterSheetId | null;
  onClose: () => void;
  sort: SortOption;
  category: ProductCategory | null;
  categories: ShopCategoryChip[];
  maxPrice: number;
  priceBounds: { min: number; max: number };
  updateParams: (updates: Record<string, string | null>) => void;
}

export function ShopMobileFilterSheets({
  sheet,
  onClose,
  sort,
  category,
  categories,
  maxPrice,
  priceBounds,
  updateParams,
}: ShopMobileFilterSheetsProps) {
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);

  useEffect(() => {
    if (sheet !== "price") return;
    setDraftMaxPrice(maxPrice);
  }, [sheet, maxPrice]);

  const applyPrice = useCallback(() => {
    const cap = priceBounds.max || draftMaxPrice;
    if (draftMaxPrice >= cap) {
      updateParams({ maxPrice: null });
    } else {
      updateParams({ maxPrice: String(draftMaxPrice) });
    }
    onClose();
  }, [draftMaxPrice, onClose, priceBounds.max, updateParams]);

  const sortOptions = SHOP_SORT_OPTIONS.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  const categoryOptions = [
    { value: "", label: "همه دسته‌ها" },
    ...categories.map((c) => ({ value: c.id, label: c.label })),
  ];

  return (
    <>
      <BottomSheet
        open={sheet === "sort"}
        onClose={onClose}
        title="مرتب‌سازی"
        aboveDock
        compact
      >
        <ShopFilterOptionList
          options={sortOptions}
          value={sort}
          onSelect={(next) => {
            updateParams({
              sort: next === "popular" ? null : next,
            });
            onClose();
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "category"}
        onClose={onClose}
        title="دسته‌بندی"
        aboveDock
        compact
      >
        <ShopFilterOptionList
          options={categoryOptions}
          value={category ?? ""}
          onSelect={(next) => {
            updateParams({ category: next || null });
            onClose();
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === "price"}
        onClose={onClose}
        title="محدوده قیمت"
        aboveDock
        compact
        footer={
          <Button type="button" className="w-full" onClick={applyPrice}>
            اعمال
          </Button>
        }
      >
        <ShopPriceSheetBody
          min={priceBounds.min}
          max={priceBounds.max}
          value={draftMaxPrice}
          onChange={setDraftMaxPrice}
        />
      </BottomSheet>
    </>
  );
}

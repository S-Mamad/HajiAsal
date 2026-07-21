"use client";

import { cn } from "@/lib/utils";

export const PRODUCT_FORM_TABS = [
  { id: "basic", label: "اطلاعات پایه" },
  { id: "pricing", label: "قیمت‌گذاری" },
  { id: "inventory", label: "موجودی" },
  { id: "variations", label: "تنوع وزن" },
  { id: "media", label: "رسانه" },
  { id: "seo", label: "سئو" },
  { id: "custom", label: "فیلدهای سفارشی" },
  { id: "advanced", label: "پیشرفته" },
] as const;

export type ProductFormTabId = (typeof PRODUCT_FORM_TABS)[number]["id"];

export function ProductFormTabs({
  active,
  onChange,
}: {
  active: ProductFormTabId;
  onChange: (id: ProductFormTabId) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px">
      {PRODUCT_FORM_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 rounded-t-lg px-3 py-2.5 text-sm transition-colors",
            active === tab.id
              ? "bg-white font-medium text-zinc-900 shadow-[inset_0_-2px_0_0_#18181b]"
              : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

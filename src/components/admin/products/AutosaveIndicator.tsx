"use client";

import { cn } from "@/lib/utils";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export function AutosaveIndicator({ state }: { state: AutosaveState }) {
  const label =
    state === "saving"
      ? "در حال ذخیره خودکار..."
      : state === "saved"
        ? "ذخیره شد"
        : state === "error"
          ? "خطا در ذخیره خودکار"
          : "آماده";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
        state === "saving" && "bg-amber-50 text-amber-700",
        state === "saved" && "bg-emerald-50 text-emerald-700",
        state === "error" && "bg-red-50 text-red-700",
        state === "idle" && "bg-stone-100 text-stone-500",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          state === "saving" && "animate-pulse bg-amber-500",
          state === "saved" && "bg-emerald-500",
          state === "error" && "bg-red-500",
          state === "idle" && "bg-stone-400",
        )}
      />
      {label}
    </span>
  );
}

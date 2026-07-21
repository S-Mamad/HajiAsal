"use client";

import { SELLER_SHORTCUTS } from "@/lib/seller/shortcuts";

export function ShortcutsHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[1px]"
      dir="rtl"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="بستن"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-md rounded-[12px] border border-zinc-200 bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold tracking-tight text-zinc-900">
          میانبرهای صفحه‌کلید
        </h3>
        <ul className="mt-4 space-y-2">
          {SELLER_SHORTCUTS.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-zinc-600">{s.description}</span>
              <kbd className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-800">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-5 w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98]"
        >
          بستن
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, X } from "@phosphor-icons/react";
import { useCartStore } from "@/store/cart";
import { hajiasalPath } from "@/lib/paths";
import { formatPersianNumber } from "@/lib/utils";

const HIDE = /^\/(cart|checkout|login|register|admin|seller)(\/|$)/;
const ABANDONED_MS = 2 * 60 * 60 * 1000; // 2 hours

export function AbandonedCartChip() {
  const pathname = usePathname() ?? "";
  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const lastInteractedAt = useCartStore((s) => s.lastInteractedAt);
  const itemCount = useCartStore((s) => s.getItemCount());
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!hasHydrated || dismissed || HIDE.test(pathname) || items.length === 0) {
    return null;
  }

  const interacted = lastInteractedAt ?? 0;
  if (!interacted || now - interacted < ABANDONED_MS) return null;

  return (
    <div className="fixed inset-x-3 top-[var(--toast-top)] z-[112] flex justify-center sm:inset-x-auto sm:end-4 sm:justify-end lg:end-6">
      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface/95 p-2.5 ps-3 pe-3 shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)] backdrop-blur-md">
        <button
          type="button"
          className="absolute -top-2 -start-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-secondary shadow-sm transition hover:bg-surface-muted hover:text-primary"
          onClick={() => setDismissed(true)}
          aria-label="بستن"
        >
          <X size={12} weight="bold" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
            <ShoppingBag size={18} weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-snug text-primary">
              سبد خرید هنوز منتظر شماست
            </p>
            <p className="mt-0.5 text-[11px] text-secondary">
              {formatPersianNumber(itemCount)} کالا آماده تکمیل خرید
            </p>
          </div>
          <Link
            href={hajiasalPath("/cart")}
            className="shrink-0 rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-ink-on-gold transition hover:bg-gold-bright"
          >
            تکمیل
          </Link>
        </div>
      </div>
    </div>
  );
}

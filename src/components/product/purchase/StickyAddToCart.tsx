"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import type { StickyAddToCartProps } from "../types";
import { useRegisterStickyBottomBar } from "@/hooks/useRegisterStickyBottomBar";

export function StickyAddToCart({
  title,
  price,
  discountPrice,
  inStock,
  onAddToCart,
  busy = false,
}: StickyAddToCartProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  useRegisterStickyBottomBar(inStock && isSticky, barRef);

  useEffect(() => {
    if (!inStock) {
      setIsSticky(false);
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const dockPx = (() => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--mobile-dock-clearance")
        .trim();
      const n = Number.parseFloat(raw);
      return Number.isFinite(n) ? n : 64;
    })();

    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: `0px 0px -${dockPx}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [inStock]);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <AnimatePresence>
        {inStock && isSticky ? (
          <motion.div
            ref={barRef}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-[var(--mobile-dock-clearance)] z-[111] border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md lg:hidden"
          >
            <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">
                  {title}
                </p>
                <PriceDisplay
                  price={price}
                  discountPrice={discountPrice}
                  size="sm"
                />
              </div>
              <Button
                size="sm"
                disabled={busy}
                onClick={onAddToCart}
                className="shrink-0"
              >
                <ShoppingBag size={16} />
                {busy ? "..." : "افزودن"}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {inStock && isSticky ? (
        <div
          className="h-[var(--sticky-bottom-bar-h,4.5rem)] lg:hidden"
          aria-hidden
        />
      ) : null}
    </>
  );
}

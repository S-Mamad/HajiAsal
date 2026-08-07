"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import type { StickyAddToCartProps } from "../types";

export function StickyAddToCart({
  title,
  price,
  discountPrice,
  inStock,
  onAddToCart,
}: StickyAddToCartProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px" aria-hidden />
      <AnimatePresence>
        {isSticky ? (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-[var(--mobile-dock-clearance)] z-[111] border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md md:hidden"
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
                disabled={!inStock}
                onClick={onAddToCart}
                className="shrink-0"
              >
                <ShoppingBag size={16} />
                {inStock ? "افزودن" : "ناموجود"}
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

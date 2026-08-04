"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useCartStore } from "@/store/cart";
import { shouldShowFloatingNav } from "@/lib/layout/floating-nav";
import { cn } from "@/lib/utils";

export function CartLiveRegion() {
  const pathname = usePathname() ?? "/";
  const announcement = useCartStore((s) => s.announcement);
  const clearAnnouncement = useCartStore((s) => s.clearAnnouncement);
  const liftForNav = shouldShowFloatingNav(pathname);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => clearAnnouncement(), 3500);
    return () => window.clearTimeout(timer);
  }, [announcement, clearAnnouncement]);

  return (
    <AnimatePresence>
      {announcement ? (
        <motion.div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className={cn(
            "pointer-events-none fixed start-1/2 z-[100] -translate-x-1/2 rounded-full border border-border bg-brown px-5 py-2.5 text-sm font-medium text-cream shadow-lg",
            liftForNav
              ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom))] lg:bottom-6"
              : "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6",
          )}
        >
          {announcement}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

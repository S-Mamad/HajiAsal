"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCartStore } from "@/store/cart";

export function CartLiveRegion() {
  const announcement = useCartStore((s) => s.announcement);
  const clearAnnouncement = useCartStore((s) => s.clearAnnouncement);

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
          className="pointer-events-none fixed bottom-6 start-1/2 z-[100] -translate-x-1/2 rounded-full border border-border bg-brown px-5 py-2.5 text-sm font-medium text-cream shadow-lg"
        >
          {announcement}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

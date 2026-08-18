"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

function isErrorAnnouncement(text: string) {
  return /ناموجود|کافی نیست|اضافه نشد/.test(text);
}

export function CartLiveRegion() {
  const announcement = useCartStore((s) => s.announcement);
  const clearAnnouncement = useCartStore((s) => s.clearAnnouncement);
  const error = announcement ? isErrorAnnouncement(announcement) : false;

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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="pointer-events-none fixed inset-x-0 top-[var(--toast-top)] z-[112] flex justify-center px-4"
        >
          <div
            className={cn(
              "pointer-events-auto flex w-full max-w-[22rem] items-start gap-2.5 rounded-2xl border border-border px-3 py-2.5",
              "bg-surface/95 text-primary shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)] backdrop-blur-md",
            )}
          >
            <span
              className={cn(
                "mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                error
                  ? "bg-red-500/10 text-red-600"
                  : "bg-gold-dim text-gold",
              )}
            >
              {error ? (
                <WarningCircle size={16} weight="fill" />
              ) : (
                <CheckCircle size={16} weight="fill" />
              )}
            </span>
            <p className="min-w-0 flex-1 pt-0.5 text-start text-[13px] font-medium leading-snug">
              {announcement}
            </p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

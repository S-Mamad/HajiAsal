"use client";

import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck } from "@phosphor-icons/react";

interface PaymentHandoffOverlayProps {
  open: boolean;
  message?: string;
}

export function PaymentHandoffOverlay({
  open,
  message = "در حال ایجاد نشست امن بانکی...",
}: PaymentHandoffOverlayProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-white/80 px-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-live="assertive"
          aria-label={message}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-sm rounded-2xl border border-border bg-white/90 p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <ShieldCheck
                size={32}
                weight="duotone"
                className="animate-pulse"
              />
            </div>
            <p className="text-base font-semibold text-primary">{message}</p>
            <p className="mt-2 text-xs text-secondary">
              لطفاً صفحه را نبندید و دکمه را دوباره نزنید.
            </p>
            <div className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-surface-muted">
              <motion.div
                className="h-full bg-amber-500"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

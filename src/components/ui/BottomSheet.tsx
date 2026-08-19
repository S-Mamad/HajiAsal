"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Sit above MobileDock clearance */
  aboveDock?: boolean;
  className?: string;
  /** Full-bleed content (e.g. map) without padded scroll body */
  flush?: boolean;
  showHandle?: boolean;
  /** Skip default title/close row (custom chrome in children) */
  hideHeader?: boolean;
  /** Extra classes on the scrim button */
  overlayClassName?: string;
  /** Extra classes on the scrollable body */
  bodyClassName?: string;
  /** Shorter sheet for simple pickers (filters, sort, …) */
  compact?: boolean;
}

function SheetHeader({
  title,
  titleId,
  compact,
  onClose,
}: {
  title?: string;
  titleId: string;
  compact: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-2",
        compact && "px-3.5 pb-1.5 pt-1.5",
      )}
    >
      {title ? (
        <h2
          id={titleId}
          className={cn(
            "font-semibold text-primary",
            compact ? "text-[15px]" : "text-base",
          )}
        >
          {title}
        </h2>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onClose}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-secondary hover:bg-surface-muted hover:text-primary"
        aria-label="بستن"
      >
        <X size={18} />
      </button>
    </div>
  );
}

function SheetHandle({ compact }: { compact: boolean }) {
  return (
    <div
      className={cn("flex shrink-0 justify-center sm:hidden", compact ? "pt-1.5" : "pt-2")}
      aria-hidden
    >
      <span className="h-1 w-10 rounded-full bg-border-bright" />
    </div>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  aboveDock = true,
  className,
  flush = false,
  showHandle = true,
  hideHeader = false,
  overlayClassName,
  bodyClassName,
  compact = false,
}: BottomSheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const FOCUSABLE =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panelRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const bodyPadding = !flush && (compact ? "px-3.5 pb-2.5" : "px-4 pb-4");

  const dockPad = aboveDock
    ? "max-sm:pb-[var(--mobile-dock-clearance,4rem)]"
    : "pb-[max(0.5rem,env(safe-area-inset-bottom))]";

  const compactPanel = (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal
      aria-labelledby={title ? titleId : undefined}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "relative z-10 w-full max-h-[min(72dvh,28rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl",
        className,
      )}
    >
      {showHandle ? <SheetHandle compact /> : null}
      {hideHeader && title ? (
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
      ) : null}
      {!hideHeader ? (
        <SheetHeader title={title} titleId={titleId} compact onClose={onClose} />
      ) : null}
      <div className={cn("shrink-0", bodyPadding, bodyClassName)}>{children}</div>
      {footer ? (
        <div className="shrink-0 border-t border-border px-3.5 py-2.5">{footer}</div>
      ) : null}
    </motion.div>
  );

  const fullPanel = (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal
      aria-labelledby={title ? titleId : undefined}
      initial={{ y: "100%", opacity: 0.9 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0.9 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "relative z-10 flex w-full max-h-[min(92dvh,720px)] flex-col rounded-t-2xl border border-border bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl",
        className,
      )}
    >
      {showHandle ? <SheetHandle compact={false} /> : null}
      {hideHeader && title ? (
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
      ) : null}
      {!hideHeader ? (
        <SheetHeader
          title={title}
          titleId={titleId}
          compact={false}
          onClose={onClose}
        />
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          bodyPadding,
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? (
        <div
          className={cn(
            "shrink-0 border-t border-border px-4 py-3",
            aboveDock
              ? "pb-3"
              : "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          )}
        >
          {footer}
        </div>
      ) : null}
    </motion.div>
  );

  const sheet = (
    <AnimatePresence>
      {open ? (
        compact ? (
          <div
            className={cn(
              "fixed inset-0 z-[130] flex items-end justify-center sm:items-center",
              dockPad,
            )}
          >
            <motion.button
              type="button"
              aria-label="بستن"
              className={cn(
                "absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-[1px]",
                overlayClassName,
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            {compactPanel}
          </div>
        ) : (
          <div
            className={cn(
              "fixed inset-0 z-[130] flex items-end justify-center sm:items-center",
              aboveDock && "max-sm:pb-[var(--mobile-dock-clearance,4rem)] sm:pb-0",
            )}
          >
            <motion.button
              type="button"
              aria-label="بستن"
              className={cn(
                "absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-[1px]",
                overlayClassName,
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            {fullPanel}
          </div>
        )
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(sheet, document.body);
}

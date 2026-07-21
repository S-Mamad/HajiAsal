"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

export function AdminModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: AdminModalProps) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[1px]"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={cn(
          "relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-[12px] border border-zinc-200 bg-white shadow-2xl sm:rounded-[12px]",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100"
            aria-label="بستن"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 px-4 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "تأیید",
  danger = false,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 active:scale-[0.98]",
              danger ? "bg-red-700 hover:bg-red-800" : "bg-zinc-900 hover:bg-zinc-800",
            )}
          >
            {loading ? "در حال انجام..." : confirmLabel}
          </button>
        </>
      }
    >
      {description ? (
        <p className="text-sm leading-6 text-zinc-600">{description}</p>
      ) : null}
    </AdminModal>
  );
}

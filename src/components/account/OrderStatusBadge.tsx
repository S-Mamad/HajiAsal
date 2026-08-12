import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending_payment:
    "bg-amber-50 text-amber-900 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800/50",
  confirmed: "bg-gold-dim text-gold ring-gold/25",
  processing:
    "bg-sky-50 text-sky-900 ring-sky-200/70 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/50",
  shipped:
    "bg-violet-50 text-violet-900 ring-violet-200/70 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-800/50",
  delivered:
    "bg-emerald-50 text-emerald-900 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800/50",
  cancelled:
    "bg-red-50 text-red-800 ring-red-200/70 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800/50",
  refunded:
    "bg-orange-50 text-orange-900 ring-orange-200/70 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-800/50",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  refunded: "بازپرداخت شده",
};

export function OrderStatusBadge({
  status,
  refunded = false,
  className,
}: {
  status: string;
  refunded?: boolean;
  className?: string;
}) {
  const key = refunded ? "refunded" : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STATUS_STYLES[key] ?? "bg-surface-muted text-secondary ring-border",
        className,
      )}
    >
      {ORDER_STATUS_LABELS[key] ?? status}
    </span>
  );
}

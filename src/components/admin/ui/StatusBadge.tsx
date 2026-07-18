import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/server/orders";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  active: "فعال",
  disabled: "غیرفعال",
  draft: "پیش‌نویس",
  published: "منتشر شده",
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
  open: "باز",
  closed: "بسته",
  answered: "پاسخ‌داده‌شده",
  new: "جدید",
  normal: "عادی",
  high: "بالا",
  low: "پایین",
};

const STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-700 ring-sky-200",
  processing: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  shipped: "bg-violet-50 text-violet-700 ring-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  answered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  disabled: "bg-stone-100 text-stone-600 ring-stone-200",
  draft: "bg-stone-100 text-stone-600 ring-stone-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  new: "bg-amber-50 text-amber-700 ring-amber-200",
  open: "bg-sky-50 text-sky-700 ring-sky-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  closed: "bg-stone-100 text-stone-600 ring-stone-200",
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  normal: "bg-stone-100 text-stone-600 ring-stone-200",
  low: "bg-sky-50 text-sky-700 ring-sky-200",
};

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status] ?? "bg-stone-100 text-stone-600 ring-stone-200",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export { STATUS_LABELS };

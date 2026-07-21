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
  pending_payment: "bg-amber-50 text-amber-800 ring-amber-200/80",
  confirmed: "bg-sky-50 text-sky-800 ring-sky-200/80",
  processing: "bg-indigo-50 text-indigo-800 ring-indigo-200/80",
  shipped: "bg-violet-50 text-violet-800 ring-violet-200/80",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  cancelled: "bg-rose-50 text-rose-800 ring-rose-200/80",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  answered: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  disabled: "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
  draft: "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
  pending: "bg-amber-50 text-amber-800 ring-amber-200/80",
  new: "bg-amber-50 text-amber-800 ring-amber-200/80",
  open: "bg-sky-50 text-sky-800 ring-sky-200/80",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200/80",
  closed: "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
  high: "bg-rose-50 text-rose-800 ring-rose-200/80",
  normal: "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
  low: "bg-sky-50 text-sky-800 ring-sky-200/80",
};

interface StatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export { STATUS_LABELS };

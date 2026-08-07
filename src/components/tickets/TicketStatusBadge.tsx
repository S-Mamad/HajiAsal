import { cn } from "@/lib/utils";
import {
  ticketPriorityLabel,
  ticketStatusLabel,
  type TicketChatVariant,
} from "./chat-utils";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-sky-50 text-sky-800 ring-sky-200/80",
  waiting: "bg-amber-50 text-amber-900 ring-amber-200/80",
  pending: "bg-gold-dim text-primary ring-gold/30",
  answered: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  closed: "bg-stone-100 text-stone-600 ring-stone-200/80",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-rose-50 text-rose-800 ring-rose-200/80",
  normal: "bg-stone-100 text-stone-600 ring-stone-200/80",
  low: "bg-sky-50 text-sky-800 ring-sky-200/80",
};

const ADMIN_STATUS: Record<string, string> = {
  open: "bg-sky-50 text-sky-800 ring-sky-200/80",
  waiting: "bg-amber-50 text-amber-800 ring-amber-200/80",
  pending: "bg-amber-50 text-amber-800 ring-amber-200/80",
  answered: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  closed: "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
};

type Props = {
  status?: string;
  priority?: string;
  variant?: TicketChatVariant;
  className?: string;
};

export function TicketStatusBadge({
  status,
  priority,
  variant = "storefront",
  className,
}: Props) {
  if (priority) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
          PRIORITY_STYLES[priority] ?? "bg-stone-100 text-stone-600 ring-stone-200/80",
          className,
        )}
      >
        {ticketPriorityLabel(priority)}
      </span>
    );
  }

  const styles =
    variant === "admin"
      ? ADMIN_STATUS[status ?? ""]
      : STATUS_STYLES[status ?? ""];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        styles ?? "bg-stone-100 text-stone-600 ring-stone-200/80",
        className,
      )}
    >
      {ticketStatusLabel(status ?? "")}
    </span>
  );
}

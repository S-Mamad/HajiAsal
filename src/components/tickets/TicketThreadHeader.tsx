"use client";

import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { cn } from "@/lib/utils";
import type { TicketChatVariant } from "./chat-utils";

type Props = {
  subject: string;
  status: string;
  priority?: string;
  partyLabel?: string | null;
  channelLabel?: string | null;
  variant: TicketChatVariant;
  actions?: React.ReactNode;
};

export function TicketThreadHeader({
  subject,
  status,
  priority,
  partyLabel,
  channelLabel,
  variant,
  actions,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-start sm:justify-between",
        variant === "storefront" ? "border-border bg-surface" : "border-stone-200 bg-white",
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h2
          className={cn(
            "truncate text-base font-semibold sm:text-lg",
            variant === "storefront" ? "text-primary" : "text-zinc-900",
          )}
        >
          {subject}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          {priority ? <StatusBadge status={priority} /> : null}
          {channelLabel ? (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                variant === "storefront"
                  ? "bg-gold-dim text-primary ring-gold/30"
                  : "bg-amber-50 text-amber-900 ring-amber-200/80",
              )}
            >
              {channelLabel}
            </span>
          ) : null}
          {partyLabel ? (
            <span
              className={cn(
                "text-xs",
                variant === "storefront" ? "text-secondary" : "text-stone-500",
              )}
            >
              {partyLabel}
            </span>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

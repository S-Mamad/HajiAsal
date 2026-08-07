"use client";

import { useEffect, useRef, useState } from "react";
import { DotsThree, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { ticketStatusHint, type TicketChatVariant } from "./chat-utils";

type Props = {
  subject: string;
  status: string;
  priority?: string;
  partyLabel?: string | null;
  channelLabel?: string | null;
  variant: TicketChatVariant;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  muted?: boolean;
  onToggleMute?: () => void;
  compact?: boolean;
};

export function TicketThreadHeader({
  subject,
  status,
  priority,
  partyLabel,
  channelLabel,
  variant,
  actions,
  leading,
  muted,
  onToggleMute,
  compact,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const hint = ticketStatusHint(status);

  return (
    <div
      className={cn(
        "shrink-0 border-b px-3 py-2.5 sm:px-4 sm:py-3",
        variant === "storefront" ? "border-border bg-surface" : "border-stone-200 bg-white",
      )}
    >
      <div className="flex items-start gap-2">
        {leading ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h2
            className={cn(
              "truncate text-base font-semibold sm:text-lg",
              variant === "storefront" ? "text-primary" : "text-zinc-900",
            )}
          >
            {subject}
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <TicketStatusBadge status={status} variant={variant} />
            {priority && !compact ? (
              <TicketStatusBadge priority={priority} variant={variant} />
            ) : null}
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
            {partyLabel && !compact ? (
              <span
                className={cn(
                  "truncate text-xs",
                  variant === "storefront" ? "text-secondary" : "text-stone-500",
                )}
              >
                {partyLabel}
              </span>
            ) : null}
          </div>
          {hint && compact ? (
            <p
              className={cn(
                "text-[11px]",
                variant === "storefront" ? "text-secondary" : "text-stone-500",
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>

        {/* Desktop actions */}
        <div className="hidden shrink-0 flex-wrap items-center gap-2 sm:flex">
          {onToggleMute ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                variant === "storefront"
                  ? "border-border text-secondary hover:bg-surface-muted"
                  : "border-stone-200 text-stone-600 hover:bg-stone-50",
              )}
              onClick={onToggleMute}
              aria-label={muted ? "فعال کردن صدا" : "بی‌صدا"}
            >
              <Icon icon={muted ? SpeakerSlash : SpeakerHigh} size={16} />
            </button>
          ) : null}
          {actions}
        </div>

        {/* Mobile overflow menu */}
        <div className="relative shrink-0 sm:hidden" ref={menuRef}>
          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-xl border transition",
              variant === "storefront"
                ? "border-border text-primary hover:bg-surface-muted"
                : "border-stone-200 text-zinc-800 hover:bg-stone-50",
            )}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="منوی تیکت"
            aria-expanded={menuOpen}
          >
            <Icon icon={DotsThree} size={22} weight="bold" />
          </button>
          {menuOpen ? (
            <div
              className={cn(
                "absolute left-0 top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-xl border py-1 shadow-lg",
                variant === "storefront"
                  ? "border-border bg-surface"
                  : "border-stone-200 bg-white",
              )}
            >
              {onToggleMute ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm hover:bg-stone-50"
                  onClick={() => {
                    onToggleMute();
                    setMenuOpen(false);
                  }}
                >
                  <Icon icon={muted ? SpeakerSlash : SpeakerHigh} size={16} />
                  {muted ? "فعال کردن صدا" : "بی‌صدا"}
                </button>
              ) : null}
              {actions ? (
                <div
                  className="flex flex-col gap-1 border-t border-stone-100 px-2 py-2 [&_button]:w-full [&_button]:justify-center [&_select]:w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

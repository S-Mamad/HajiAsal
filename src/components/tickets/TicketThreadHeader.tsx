"use client";

import { useEffect, useRef, useState } from "react";
import {
  DotsThreeVertical,
  SpeakerHigh,
  SpeakerSlash,
  Headset,
} from "@phosphor-icons/react";
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
  const hint = ticketStatusHint(status);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isStore = variant === "storefront";

  return (
    <header
      className={cn(
        "relative z-20 shrink-0 border-b px-2.5 py-2 sm:px-4 sm:py-2.5",
        isStore
          ? "border-border/70 bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80"
          : "border-stone-200/80 bg-white/95 backdrop-blur-md",
      )}
    >
      <div className="flex items-center gap-2">
        {leading ? <div className="shrink-0">{leading}</div> : null}

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            isStore ? "bg-gold-dim text-gold" : "bg-stone-100 text-stone-700",
          )}
          aria-hidden
        >
          <Icon icon={Headset} size={20} weight="duotone" />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "truncate text-[15px] font-semibold leading-tight tracking-tight sm:text-base",
              isStore ? "text-primary" : "text-zinc-900",
            )}
          >
            {subject}
          </h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                status === "closed" || status === "resolved"
                  ? "bg-stone-400"
                  : "bg-emerald-500",
              )}
              aria-hidden
            />
            <p
              className={cn(
                "truncate text-[11px] leading-none",
                isStore ? "text-secondary" : "text-stone-500",
              )}
            >
              {hint || ticketStatusHint("open")}
              {partyLabel && !compact ? ` · ${partyLabel}` : ""}
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <TicketStatusBadge status={status} variant={variant} />
          {priority && !compact ? (
            <TicketStatusBadge priority={priority} variant={variant} />
          ) : null}
          {channelLabel ? (
            <span
              className={cn(
                "rounded-lg px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                isStore
                  ? "bg-gold-dim text-primary ring-gold/25"
                  : "bg-amber-50 text-amber-900 ring-amber-200/80",
              )}
            >
              {channelLabel}
            </span>
          ) : null}
          {onToggleMute ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-[0.97]",
                isStore
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

        <div className="relative shrink-0 sm:hidden" ref={menuRef}>
          <button
            type="button"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition active:scale-[0.97]",
              isStore
                ? "border-border/80 text-primary hover:bg-surface-muted"
                : "border-stone-200 text-zinc-800 hover:bg-stone-50",
            )}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="منوی تیکت"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <Icon icon={DotsThreeVertical} size={20} weight="bold" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className={cn(
                "absolute left-0 top-full z-30 mt-1.5 min-w-[12.5rem] overflow-hidden rounded-2xl border py-1.5 shadow-xl",
                isStore
                  ? "border-border bg-surface"
                  : "border-stone-200 bg-white",
              )}
            >
              <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
                <TicketStatusBadge status={status} variant={variant} />
                {priority ? (
                  <TicketStatusBadge priority={priority} variant={variant} />
                ) : null}
              </div>
              {onToggleMute ? (
                <button
                  type="button"
                  role="menuitem"
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
                  className="flex flex-col gap-1 border-t border-stone-100/80 px-2 py-2 [&_button]:w-full [&_button]:justify-center [&_select]:w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

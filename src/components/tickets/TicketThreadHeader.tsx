"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChatCircleDots,
  DotsThreeVertical,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SupportPresenceDot } from "@/components/support-fab/SupportPresenceDot";
import { cn } from "@/lib/utils";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { usePageCopy } from "@/hooks/usePageCopy";
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
  /** FAB / embedded widget: brand row only, no overflow sheet. */
  minimal?: boolean;
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
  minimal,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const pageCopy = usePageCopy();
  const isStore = variant === "storefront";
  const hint = ticketStatusHint(
    status,
    isStore ? pageCopy.tickets.statusHints : undefined,
  );
  const messenger = Boolean(compact && isStore);
  const closed = status === "closed" || status === "resolved";
  const subtitle = [partyLabel, hint || ticketStatusHint("open")]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const statusRow = (
    <div className="flex flex-wrap gap-1.5">
      <TicketStatusBadge status={status} variant={variant} />
      {priority ? (
        <TicketStatusBadge priority={priority} variant={variant} />
      ) : null}
      {channelLabel ? (
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-[11px] font-medium",
            isStore ? "bg-gold-dim text-primary" : "bg-amber-50 text-amber-900",
          )}
        >
          {channelLabel}
        </span>
      ) : null}
    </div>
  );

  const overflowSheet = portalReady
    ? createPortal(
        <BottomSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title="گزینه‌های گفتگو"
          aboveDock={false}
        >
          <div className="space-y-3 pt-1">
            {statusRow}
            {onToggleMute ? (
              <button
                type="button"
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-start text-sm transition active:scale-[0.99]",
                  isStore
                    ? "bg-surface-muted text-primary"
                    : "bg-stone-50 text-zinc-800",
                )}
                onClick={() => {
                  onToggleMute();
                  setMenuOpen(false);
                }}
              >
                <Icon icon={muted ? SpeakerSlash : SpeakerHigh} size={18} />
                {muted ? "فعال کردن صدا" : "بی‌صدا کردن اعلان"}
              </button>
            ) : null}
            {actions ? (
              <div
                className="flex flex-col gap-2 [&_button]:min-h-12 [&_button]:w-full [&_button]:justify-center [&_select]:w-full"
                onClick={() => setMenuOpen(false)}
              >
                {actions}
              </div>
            ) : null}
          </div>
        </BottomSheet>,
        document.body,
      )
    : null;

  return (
    <header
      className={cn(
        "relative z-20 shrink-0",
        messenger
          ? "border-b border-border bg-surface/92 px-1.5 py-1.5 backdrop-blur-xl sm:px-2.5"
          : "px-2.5 py-2 sm:px-4 sm:py-2.5",
        !messenger &&
          (isStore
            ? "bg-surface/90 shadow-[0_12px_28px_-22px_rgb(28_25_23/0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/80"
            : "bg-white/95 shadow-[0_12px_28px_-22px_rgb(28_25_23/0.28)] backdrop-blur-md"),
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        {leading ? <div className="shrink-0">{leading}</div> : null}

        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center",
            messenger ? "h-9 w-9 rounded-full" : "h-11 w-11 rounded-2xl",
            isStore ? "bg-gold-dim text-gold" : "bg-stone-100 text-stone-700",
          )}
          aria-hidden
        >
          <Icon
            icon={ChatCircleDots}
            size={messenger ? 18 : 20}
            weight="fill"
          />
          <SupportPresenceDot live={!closed} />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "truncate font-semibold leading-tight tracking-tight",
              messenger ? "text-[14.5px]" : "text-[15px] sm:text-base",
              isStore ? "text-primary" : "text-zinc-900",
            )}
          >
            {subject}
          </h2>
          <p
            className={cn(
              "mt-0.5 truncate font-light leading-none",
              messenger ? "text-[11px]" : "text-[11px]",
              isStore ? "text-secondary" : "text-stone-500",
            )}
          >
            {subtitle}
          </p>
        </div>

        <div
          className={cn(
            "hidden shrink-0 items-center gap-1.5",
            !minimal && "sm:flex",
          )}
        >
          {!messenger ? (
            <>
              <TicketStatusBadge status={status} variant={variant} />
              {priority && !compact ? (
                <TicketStatusBadge priority={priority} variant={variant} />
              ) : null}
              {channelLabel ? (
                <span
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[11px] font-medium",
                    isStore
                      ? "bg-gold-dim text-primary"
                      : "bg-amber-50 text-amber-900",
                  )}
                >
                  {channelLabel}
                </span>
              ) : null}
              {onToggleMute && !minimal ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center rounded-2xl transition active:scale-[0.97]",
                    isStore
                      ? "text-secondary hover:bg-surface-muted"
                      : "text-stone-600 hover:bg-stone-50",
                  )}
                  onClick={onToggleMute}
                  aria-label={muted ? "فعال کردن صدا" : "بی‌صدا"}
                >
                  <Icon icon={muted ? SpeakerSlash : SpeakerHigh} size={16} />
                </button>
              ) : null}
            </>
          ) : null}
          {actions}
        </div>

        {!minimal ? (
          <div className="shrink-0 sm:hidden">
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center transition active:scale-[0.97]",
                messenger ? "h-9 w-9 rounded-full" : "h-11 w-11 rounded-2xl",
                isStore
                  ? "text-primary/80 hover:bg-surface-muted hover:text-primary"
                  : "text-zinc-800 hover:bg-stone-50",
              )}
              onClick={() => setMenuOpen(true)}
              aria-label="منوی تیکت"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
            >
              <Icon icon={DotsThreeVertical} size={messenger ? 18 : 20} weight="bold" />
            </button>
            {overflowSheet}
          </div>
        ) : null}
      </div>
    </header>
  );
}

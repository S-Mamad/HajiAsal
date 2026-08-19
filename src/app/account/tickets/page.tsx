"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatCircle, ChatCircleDots, Plus } from "@phosphor-icons/react";
import { AccountSkeleton } from "@/components/account/AccountSkeleton";
import { SupportPresenceDot } from "@/components/support-fab/SupportPresenceDot";
import {
  formatRelativeShort,
  ticketStatusHint,
} from "@/components/tickets/chat-utils";
import { Icon } from "@/components/ui/Icon";
import { usePageCopy } from "@/hooks/usePageCopy";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
  unreadCount?: number;
};

const NEEDS_YOU = new Set(["pending", "answered"]);

export default function AccountTicketsPage() {
  const copy = usePageCopy();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/tickets", { credentials: "include" });
      if (!res.ok) throw new Error("بارگذاری تیکت‌ها ممکن نشد.");
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <header className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-primary sm:text-2xl">
            پیام‌ها
          </h1>
          <p className="mt-1 text-[13px] leading-5 text-secondary">
            گفتگو با پشتیبانی حاجی‌عسل
          </p>
        </div>
        {!loading && tickets.length > 0 ? (
          <Link
            href={hajiasalPath("/account/tickets/new")}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-gold px-3.5 text-[13px] font-semibold text-ink-on-gold shadow-[0_10px_24px_-14px_var(--gold-glow)] transition hover:brightness-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <Icon icon={Plus} size={15} weight="bold" />
            گفتگوی تازه
          </Link>
        ) : null}
      </header>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="overflow-hidden rounded-[1.35rem] border border-border bg-surface">
          <AccountSkeleton
            rows={4}
            className="space-y-0"
            rowClassName="h-[4.5rem] rounded-none border-b border-border last:border-0"
          />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center rounded-[1.35rem] border border-border bg-surface px-6 py-14 text-center shadow-[0_18px_40px_-32px_rgb(28_25_23/0.28)]">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-dim text-gold">
            <Icon icon={ChatCircle} size={28} weight="regular" />
          </span>
          <p className="text-[15px] font-semibold text-primary">
            هنوز گفتگویی ندارید
          </p>
          <p className="mt-1.5 max-w-xs text-[13px] leading-6 text-secondary">
            سوال سفارش یا محصول را همین‌جا بپرسید؛ پاسخ در همین گفتگو می‌آید.
          </p>
          <Link
            href={hajiasalPath("/account/tickets/new")}
            className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-full bg-gold px-4 text-[13px] font-semibold text-ink-on-gold shadow-[0_10px_24px_-14px_var(--gold-glow)] transition active:scale-[0.98]"
          >
            <Icon icon={Plus} size={15} weight="bold" />
            شروع گفتگو
          </Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[1.35rem] border border-border bg-surface shadow-[0_18px_40px_-32px_rgb(28_25_23/0.28)]">
          {tickets.map((t, index) => {
            const unread = t.unreadCount ?? 0;
            const live = unread > 0 || NEEDS_YOU.has(t.status);
            return (
              <li key={t.id}>
                <Link
                  href={hajiasalPath(`/account/tickets/${t.id}`)}
                  className={cn(
                    "group flex items-center gap-3 px-3.5 py-3",
                    "transition-colors duration-150",
                    "active:bg-gold/[0.06] touch-manipulation",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/45",
                    index < tickets.length - 1 && "border-b border-border",
                    unread > 0 && "bg-gold/[0.035]",
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                      live ? "bg-gold-dim text-gold" : "bg-surface-muted text-secondary",
                    )}
                  >
                    <Icon icon={ChatCircleDots} size={20} weight="fill" />
                    {unread > 0 ? (
                      <span className="absolute -end-0.5 -top-0.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold leading-none text-ink-on-gold ring-2 ring-surface">
                        {unread > 9 ? "۹+" : unread.toLocaleString("fa-IR")}
                      </span>
                    ) : (
                      <SupportPresenceDot
                        live={
                          t.status !== "closed" && t.status !== "resolved"
                        }
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          "min-w-0 truncate text-[15px] text-primary",
                          unread > 0 ? "font-bold" : "font-semibold",
                        )}
                      >
                        {t.subject}
                      </p>
                      <time
                        dateTime={t.updatedAt}
                        className={cn(
                          "shrink-0 text-[11px] tabular-nums",
                          unread > 0 ? "font-medium text-gold" : "text-secondary",
                        )}
                      >
                        {formatRelativeShort(t.updatedAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] leading-5 text-secondary">
                      {unread > 0
                        ? `${unread.toLocaleString("fa-IR")} پیام جدید از پشتیبانی`
                        : ticketStatusHint(t.status, copy.tickets.statusHints)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

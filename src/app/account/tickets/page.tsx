"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatCircle, CaretLeft, Plus } from "@phosphor-icons/react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountSkeleton } from "@/components/account/AccountSkeleton";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import {
  formatRelativeShort,
  ticketStatusHint,
} from "@/components/tickets/chat-utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
};

const NEEDS_ATTENTION = new Set(["pending", "answered", "open"]);

export default function AccountTicketsPage() {
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
      <AccountPageHeader
        title="پشتیبانی"
        subtitle="گفتگو با تیم حاجی‌اصل درباره سفارش و خرید."
        action={
          <Button
            href={hajiasalPath("/account/tickets/new")}
            size="sm"
            className="w-full sm:w-auto"
          >
            <Icon icon={Plus} size={16} />
            تیکت جدید
          </Button>
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-red-200/80 bg-red-50/80 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <AccountSkeleton rows={4} rowClassName="h-[4.75rem]" />
      ) : tickets.length === 0 ? (
        <EmptyState
          title="هنوز تیکتی ندارید"
          description="اگر سوالی درباره سفارش یا محصول دارید، اولین گفتگو را شروع کنید."
          action={
            <Button href={hajiasalPath("/account/tickets/new")} size="sm">
              <Icon icon={ChatCircle} size={16} />
              ساخت تیکت
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => {
            const attention = NEEDS_ATTENTION.has(t.status);
            return (
              <li key={t.id}>
                <Link
                  href={hajiasalPath(`/account/tickets/${t.id}`)}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3.5 py-3.5",
                    "transition-[border-color,background-color,transform,box-shadow] duration-200",
                    "active:scale-[0.992] touch-manipulation",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
                    attention
                      ? "border-gold/25 bg-gold/[0.04] shadow-[0_8px_24px_-18px_var(--gold-glow)]"
                      : "border-border bg-surface hover:border-gold/25 hover:bg-gold/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      attention
                        ? "bg-gold-dim text-gold"
                        : "bg-surface-muted text-secondary",
                    )}
                  >
                    <Icon icon={ChatCircle} size={20} weight="duotone" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-primary">
                        {t.subject}
                      </p>
                      <time
                        dateTime={t.updatedAt}
                        className="shrink-0 pt-0.5 text-[11px] tabular-nums text-secondary"
                      >
                        {formatRelativeShort(t.updatedAt)}
                      </time>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketStatusBadge status={t.status} />
                      <span className="truncate text-[11px] text-secondary">
                        {ticketStatusHint(t.status)}
                      </span>
                    </div>
                  </div>
                  <Icon
                    icon={CaretLeft}
                    size={16}
                    className="shrink-0 text-secondary/50 transition group-hover:text-gold"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

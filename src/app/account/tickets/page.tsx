"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatCircle, Plus } from "@phosphor-icons/react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountSkeleton } from "@/components/account/AccountSkeleton";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { ticketStatusHint } from "@/components/tickets/chat-utils";
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
        subtitle="سوال سفارش یا خرید را همین‌جا بپرسید."
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
          className="mb-4 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <AccountSkeleton rows={3} rowClassName="h-20" />
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
        <ul className="space-y-2.5">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={hajiasalPath(`/account/tickets/${t.id}`)}
                className={cn(
                  "account-surface flex flex-col gap-2 rounded-2xl border border-border bg-surface px-4 py-3.5",
                  "transition-[border-color,background-color,transform] duration-200",
                  "hover:border-gold/30 hover:bg-gold/[0.03] active:scale-[0.995]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-medium text-primary">
                    {t.subject}
                  </p>
                  <TicketStatusBadge status={t.status} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                  <span>{ticketStatusHint(t.status)}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={t.updatedAt}>
                    {new Date(t.updatedAt).toLocaleString("fa-IR")}
                  </time>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

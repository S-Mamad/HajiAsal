"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatCircle, Plus } from "@phosphor-icons/react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Icon } from "@/components/ui/Icon";
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
      if (!res.ok) throw new Error("خطا در بارگذاری");
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
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
        subtitle="تیکت بسازید و پاسخ تیم حاجی‌عسل را همین‌جا ببینید."
        action={
          <Link
            href={hajiasalPath("/account/tickets/new")}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-medium text-primary transition hover:brightness-95"
          >
            <Icon icon={Plus} size={16} />
            تیکت جدید
          </Link>
        }
      />

      <p className="mb-5 rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 text-sm text-secondary">
        برای پیگیری سفارش یا سوالات خرید، از همین بخش پیام بگذارید. فرم تماس عمومی
        همچنان برای پیام‌های عمومی در دسترس است.
      </p>

      {error ? (
        <p className="mb-4 text-sm text-rose-600">{error}</p>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-border/50" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-16 text-center">
          <Icon icon={ChatCircle} size={40} className="text-secondary/60" />
          <p className="text-sm text-secondary">هنوز تیکتی ندارید</p>
          <Link
            href={hajiasalPath("/account/tickets/new")}
            className="text-sm font-medium text-gold hover:underline"
          >
            اولین تیکت را بسازید
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={hajiasalPath(`/account/tickets/${t.id}`)}
                className={cn(
                  "flex flex-col gap-2 px-4 py-4 transition hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:justify-between",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-primary">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    {new Date(t.updatedAt).toLocaleString("fa-IR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

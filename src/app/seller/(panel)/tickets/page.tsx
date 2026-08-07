"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatCircle, Plus } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { ticketStatusHint } from "@/components/tickets/chat-utils";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  updatedAt: string;
};

export default function SellerTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/tickets");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTickets([]);
        setError(data.error ?? "خطا در بارگذاری تیکت‌ها");
        return;
      }
      setTickets(data.tickets ?? []);
    } catch {
      setError("خطا در بارگذاری تیکت‌ها");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">گفتگو با تیم حاجی‌عسل</p>
        <AdminButton
          onClick={() => router.push(hajiasalPath("/seller/tickets/new"))}
          className="w-full sm:w-auto"
        >
          <Icon icon={Plus} size={16} />
          تیکت جدید
        </AdminButton>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span>{error}</span>
          <AdminButton size="sm" variant="outline" onClick={() => void load()}>
            تلاش دوباره
          </AdminButton>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
          ))
        ) : tickets.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--panel-border)] px-4 py-12 text-center">
            <Icon icon={ChatCircle} size={36} className="text-zinc-300" />
            <p className="text-sm text-zinc-500">هنوز تیکتی ثبت نکرده‌اید</p>
          </div>
        ) : (
          tickets.map((t) => (
            <Link
              key={t.id}
              href={hajiasalPath(`/seller/tickets/${t.id}`)}
              className={cn(
                "flex flex-col gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white px-4 py-3.5",
                "transition hover:bg-zinc-50 active:scale-[0.995]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 truncate font-medium text-zinc-900">
                  {t.subject}
                </p>
                <TicketStatusBadge status={t.status} variant="admin" />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>{ticketStatusHint(t.status)}</span>
                <span aria-hidden>·</span>
                <time dateTime={t.updatedAt}>
                  {new Date(t.updatedAt).toLocaleString("fa-IR")}
                </time>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <SellerDataTable
          storageKey="seller.tickets.grid"
          loading={loading}
          error={error || null}
          onRetry={() => void load()}
          columns={[
            {
              key: "subject",
              header: "عنوان",
              render: (r) => (
                <Link
                  href={hajiasalPath(`/seller/tickets/${r.id}`)}
                  className="font-medium text-amber-900 hover:underline"
                >
                  {r.subject}
                </Link>
              ),
            },
            {
              key: "status",
              header: "وضعیت",
              render: (r) => (
                <TicketStatusBadge status={r.status} variant="admin" />
              ),
            },
            {
              key: "priority",
              header: "اولویت",
              render: (r) => (
                <TicketStatusBadge priority={r.priority} variant="admin" />
              ),
            },
            {
              key: "updated",
              header: "به‌روزرسانی",
              render: (r) => new Date(r.updatedAt).toLocaleString("fa-IR"),
            },
          ]}
          data={tickets}
          rowKey={(r) => r.id}
          emptyMessage="هنوز تیکتی ثبت نکرده‌اید"
        />
      </div>
    </div>
  );
}

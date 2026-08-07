"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatCircle, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminInput, AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { TicketStatusBadge } from "@/components/tickets/TicketStatusBadge";
import { ticketStatusHint } from "@/components/tickets/chat-utils";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import type { UnifiedTicketListItem } from "@/lib/tickets/types";

export default function AdminTicketsPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [items, setItems] = useState<UnifiedTicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    customerName: "",
    customerPhone: "",
    priority: "normal",
    body: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ channel, status, priority, q });
      const res = await fetch(`/api/admin/tickets?${params}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setItems(data.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [channel, status, priority, q, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCount = useMemo(
    () =>
      items.filter((t) =>
        ["open", "waiting", "answered", "new", "pending"].includes(t.status),
      ).length,
    [items],
  );

  const createTicket = async () => {
    if (!form.subject.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject.trim(),
          customerName: form.customerName || null,
          customerPhone: form.customerPhone || null,
          priority: form.priority,
          body: form.body || undefined,
          status: "open",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setCreateOpen(false);
      setForm({
        subject: "",
        customerName: "",
        customerPhone: "",
        priority: "normal",
        body: "",
      });
      toast.success("تیکت ایجاد شد");
      router.push(
        hajiasalPath(`/admin/tickets/${data.item.id}?channel=customer`),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">صندوق تیکت‌ها</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {openCount} تیکت فعال از مجموع {items.length}
          </p>
        </div>
        <Can permission="tickets.manage">
          <AdminButton onClick={() => setCreateOpen(true)}>
            <Icon icon={Plus} size={16} />
            تیکت مشتری جدید
          </AdminButton>
        </Can>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3">
        <div className="relative w-full">
          <Icon
            icon={MagnifyingGlass}
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setQ(qDraft);
            }}
            onBlur={() => setQ(qDraft)}
            placeholder="جستجو موضوع، نام، موبایل…"
            className="h-11 w-full rounded-lg border border-stone-200 bg-stone-50 pe-3 ps-9 text-sm outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm"
          >
            <option value="all">همه کانال‌ها</option>
            <option value="customer">مشتری</option>
            <option value="seller">فروشنده</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="open">باز</option>
            <option value="waiting">در انتظار پاسخ</option>
            <option value="pending">منتظر کاربر</option>
            <option value="resolved">حل‌شده</option>
            <option value="closed">بسته</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-11 rounded-lg border border-stone-200 bg-white px-3 text-sm"
          >
            <option value="all">همه اولویت‌ها</option>
            <option value="low">کم</option>
            <option value="normal">عادی</option>
            <option value="high">بالا</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Icon icon={ChatCircle} size={36} className="text-stone-300" />
            <p className="text-sm text-stone-500">تیکتی با این فیلترها نیست</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map((t) => (
              <li key={`${t.channel}:${t.id}`}>
                <Link
                  href={hajiasalPath(
                    `/admin/tickets/${t.id}?channel=${t.channel}`,
                  )}
                  className="flex flex-col gap-2 px-4 py-3.5 transition hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                          t.channel === "seller"
                            ? "bg-violet-50 text-violet-800 ring-violet-200/80"
                            : "bg-sky-50 text-sky-800 ring-sky-200/80",
                        )}
                      >
                        {t.channel === "seller" ? "فروشنده" : "مشتری"}
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                        {t.subject}
                      </p>
                    </div>
                    <p className="truncate text-xs text-stone-500">
                      {ticketStatusHint(t.status) ||
                        t.partyName ||
                        t.partyPhone ||
                        t.sellerId ||
                        "—"}
                      {" · "}
                      {new Date(t.updatedAt).toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <TicketStatusBadge priority={t.priority} variant="admin" />
                    <TicketStatusBadge status={t.status} variant="admin" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="تیکت مشتری جدید"
      >
        <div className="space-y-3">
          <FormField label="موضوع" required>
            <AdminInput
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </FormField>
          <FormField label="نام مشتری">
            <AdminInput
              value={form.customerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerName: e.target.value }))
              }
            />
          </FormField>
          <FormField label="موبایل">
            <AdminInput
              dir="ltr"
              value={form.customerPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerPhone: e.target.value }))
              }
            />
          </FormField>
          <FormField label="اولویت">
            <select
              className="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value }))
              }
            >
              <option value="low">کم</option>
              <option value="normal">عادی</option>
              <option value="high">بالا</option>
            </select>
          </FormField>
          <FormField label="پیام اولیه (اختیاری)">
            <AdminTextarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="outline" onClick={() => setCreateOpen(false)}>
              انصراف
            </AdminButton>
            <AdminButton
              disabled={creating || !form.subject.trim()}
              onClick={() => void createTicket()}
            >
              ایجاد
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

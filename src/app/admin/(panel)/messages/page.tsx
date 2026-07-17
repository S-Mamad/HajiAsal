"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { ContactMessage } from "@/lib/server/newsletter";
import { hajiasalPath } from "@/lib/paths";

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [note, setNote] = useState("");

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/messages");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const markRead = async (msg: ContactMessage) => {
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id, read: true }),
      });
      if (!res.ok) throw new Error("خطا در به‌روزرسانی");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, readAt: m.readAt ?? new Date().toISOString() }
            : m,
        ),
      );
      setSelected((s) =>
        s?.id === msg.id
          ? { ...s, readAt: s.readAt ?? new Date().toISOString() }
          : s,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  };

  const saveNote = async () => {
    if (!selected) return;
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, adminNote: note }),
      });
      if (!res.ok) throw new Error("خطا در ذخیره یادداشت");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selected.id ? { ...m, adminNote: note } : m,
        ),
      );
      setSelected({ ...selected, adminNote: note });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {messages.length.toLocaleString("fa-IR")} پیام
        </p>
        <AdminButton type="button" variant="outline" onClick={() => void loadMessages()}>
          بروزرسانی
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          data={messages}
          rowKey={(row) => row.id}
          emptyMessage="پیامی دریافت نشده است"
          columns={[
            {
              key: "name",
              header: "فرستنده",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => {
                    setSelected(row);
                    setNote(row.adminNote ?? "");
                    if (!row.readAt) void markRead(row);
                    window.setTimeout(() => {
                      document
                        .getElementById("message-detail")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                  }}
                  className="min-h-10 w-full rounded-lg px-1 py-1 text-start hover:bg-slate-50"
                >
                  <p className="font-medium text-slate-800">{row.name}</p>
                  <p className="text-xs text-slate-400">{row.subject}</p>
                </button>
              ),
            },
            {
              key: "date",
              header: "تاریخ",
              render: (row) =>
                new Date(row.createdAt).toLocaleDateString("fa-IR"),
            },
            {
              key: "read",
              header: "وضعیت",
              render: (row) => (
                <span
                  className={
                    row.readAt ? "text-slate-400" : "font-medium text-amber-600"
                  }
                >
                  {row.readAt ? "خوانده‌شده" : "جدید"}
                </span>
              ),
            },
          ]}
        />

        <div
          id="message-detail"
          className="rounded-xl border border-slate-200 bg-white p-5 scroll-mt-20"
        >
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">{selected.name}</h3>
                <p className="text-sm text-slate-500" dir="ltr">
                  {selected.phone} · {selected.email}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {selected.subject}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {selected.message}
              </p>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-500">یادداشت داخلی</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </label>
              <AdminButton type="button" onClick={() => void saveNote()}>
                ذخیره یادداشت
              </AdminButton>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              یک پیام را برای مشاهده جزئیات انتخاب کنید
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

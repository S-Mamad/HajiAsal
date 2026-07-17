"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { NewsletterSubscriber } from "@/lib/server/newsletter";
import { hajiasalPath } from "@/lib/paths";

export default function AdminNewsletterPage() {
  const router = useRouter();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setSubscribers(data.subscribers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSubscribers();
  }, [loadSubscribers]);

  const exportCsv = () => {
    const rows = [
      ["email", "subscribedAt"],
      ...subscribers.map((s) => [s.email, s.subscribedAt]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {subscribers.length.toLocaleString("fa-IR")} مشترک
        </p>
        <div className="flex gap-2">
          <AdminButton type="button" variant="outline" onClick={exportCsv}>
            خروجی CSV
          </AdminButton>
          <AdminButton type="button" variant="outline" onClick={() => void loadSubscribers()}>
            بروزرسانی
          </AdminButton>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      <DataTable
        data={subscribers}
        rowKey={(row) => row.email}
        emptyMessage="مشترکی ثبت نشده است"
        columns={[
          {
            key: "email",
            header: "ایمیل",
            render: (row) => (
              <span dir="ltr" className="font-mono text-xs">
                {row.email}
              </span>
            ),
          },
          {
            key: "date",
            header: "تاریخ عضویت",
            render: (row) =>
              new Date(row.subscribedAt).toLocaleDateString("fa-IR"),
          },
        ]}
      />
    </div>
  );
}

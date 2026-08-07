"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

type AppStatus = "pending" | "approved" | "rejected";

interface ApplicationRow {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  status: AppStatus;
  createdAt: string;
  sellerId?: string | null;
}

const STATUS_LABELS: Record<AppStatus, string> = {
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
};

const STATUS_STYLES: Record<AppStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminSellerApplicationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppStatus>("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/seller-applications?status=${statusFilter}`,
      );
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setRows(data.applications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.nationalId.includes(q),
    );
  }, [rows, query]);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          درخواست‌های فروشنده
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          بررسی مدارک و تأیید یا رد ثبت‌نام فروشندگان
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو نام، موبایل، کد ملی..."
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | AppStatus)
          }
          className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        >
          <option value="all">همه</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      <DataTable
        loading={loading}
        emptyMessage="درخواستی یافت نشد"
        columns={[
          {
            key: "fullName",
            header: "نام",
            render: (r) => (
              <Link
                href={hajiasalPath(`/admin/seller-applications/${r.id}`)}
                className="font-medium text-zinc-900 hover:text-amber-800"
              >
                {r.fullName}
              </Link>
            ),
          },
          {
            key: "phone",
            header: "موبایل",
            render: (r) => <span dir="ltr">{r.phone}</span>,
          },
          {
            key: "nationalId",
            header: "کد ملی",
            render: (r) => <span dir="ltr">{r.nationalId}</span>,
          },
          {
            key: "status",
            header: "وضعیت",
            render: (r) => (
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[r.status]}`}
              >
                {STATUS_LABELS[r.status]}
              </span>
            ),
          },
          {
            key: "createdAt",
            header: "تاریخ",
            render: (r) =>
              new Date(r.createdAt).toLocaleDateString("fa-IR"),
          },
        ]}
        data={filtered}
        rowKey={(r) => r.id}
      />
    </div>
  );
}

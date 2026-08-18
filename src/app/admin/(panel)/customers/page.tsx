"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import type { ProfileWithStats } from "@/lib/server/profiles";
import { hajiasalPath } from "@/lib/paths";

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<ProfileWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/customers");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setCustomers(data.customers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.fullName ?? "").toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {filtered.length.toLocaleString("fa-IR")} مشتری
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو نام / موبایل"
            className="panel-input sm:w-56"
          />
          <AdminButton
            type="button"
            variant="outline"
            onClick={() => void loadCustomers()}
          >
            بروزرسانی
          </AdminButton>
          <Can permission="reports.export">
            <AdminButton
              href="/api/admin/customers/export"
              variant="outline"
              external
              download
            >
              خروجی CSV
            </AdminButton>
          </Can>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <DataTable
        data={filtered}
        rowKey={(row) => row.id}
        emptyMessage="مشتری ثبت نشده است"
        loading={loading}
        error={error || null}
        onRetry={() => void loadCustomers()}
        columns={[
          {
            key: "name",
            header: "نام",
            sortable: true,
            getSortValue: (row) => row.fullName ?? "",
            render: (row) => (
              <Link
                href={hajiasalPath(`/admin/customers/${row.id}`)}
                className="font-medium text-zinc-900 hover:underline"
              >
                {row.fullName ?? "بدون نام"}
              </Link>
            ),
          },
          {
            key: "phone",
            header: "موبایل",
            render: (row) => (
              <span dir="ltr" className="font-mono text-xs">
                {row.phone}
              </span>
            ),
          },
          {
            key: "orders",
            header: "سفارش‌ها",
            sortable: true,
            getSortValue: (row) => row.orderCount,
            render: (row) => row.orderCount.toLocaleString("fa-IR"),
          },
          {
            key: "spent",
            header: "مجموع خرید",
            sortable: true,
            getSortValue: (row) => row.totalSpent,
            render: (row) =>
              `${row.totalSpent.toLocaleString("fa-IR")} تومان`,
          },
          {
            key: "joined",
            header: "عضویت",
            sortable: true,
            getSortValue: (row) =>
              row.createdAt ? new Date(row.createdAt).getTime() : 0,
            render: (row) =>
              row.createdAt
                ? new Date(row.createdAt).toLocaleDateString("fa-IR")
                : "نامشخص",
          },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <AdminButton
                href={hajiasalPath(`/admin/customers/${row.id}`)}
                variant="ghost"
                size="sm"
              >
                جزئیات
              </AdminButton>
            ),
          },
        ]}
      />
    </div>
  );
}

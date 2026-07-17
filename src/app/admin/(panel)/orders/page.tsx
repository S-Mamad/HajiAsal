"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Icon } from "@/components/ui/Icon";
import type { OrderStatus } from "@/lib/server/orders";
import { hajiasalPath } from "@/lib/paths";

interface AdminOrder {
  id: string;
  status: OrderStatus;
  userId?: string;
  customer: { fullName: string; phone: string; city: string };
  total: number;
  createdAt: string;
  trackingCode?: string;
}

const STATUS_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "همه وضعیت‌ها" },
  { value: "pending_payment", label: "در انتظار پرداخت" },
  { value: "confirmed", label: "تأیید شده" },
  { value: "processing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "ارسال شده" },
  { value: "delivered", label: "تحویل شده" },
  { value: "cancelled", label: "لغو شده" },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return (
        order.id.toLowerCase().includes(query) ||
        order.customer.fullName.toLowerCase().includes(query) ||
        order.customer.phone.includes(query) ||
        order.trackingCode?.toLowerCase().includes(query)
      );
    });
  }, [orders, search, statusFilter]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در به‌روزرسانی");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در به‌روزرسانی");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filteredOrders.length.toLocaleString("fa-IR")} سفارش
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadOrders()}
            className="w-full sm:w-auto"
          >
            بروزرسانی
          </AdminButton>
          <AdminButton
            href="/api/admin/orders/export"
            variant="outline"
            size="sm"
            external
            className="w-full sm:w-auto"
          >
            خروجی CSV
          </AdminButton>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
        <label className="relative flex-1">
          <Icon
            icon={MagnifyingGlass}
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو شناسه، نام یا تلفن..."
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pe-3 ps-9 text-sm outline-none focus:border-slate-400"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Icon icon={Funnel} size={16} className="shrink-0 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as OrderStatus | "all")
            }
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400 sm:w-auto"
            aria-label="فیلتر وضعیت"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {filteredOrders.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <Link
                href={hajiasalPath(`/admin/orders/${row.id}`)}
                className="font-mono text-xs text-sky-700"
                dir="ltr"
              >
                {row.id}
              </Link>
              <span className="text-xs text-slate-400">
                {new Date(row.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
            <p className="font-medium text-slate-900">{row.customer.fullName}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {row.customer.city}
              <span className="mx-1.5 text-slate-300">·</span>
              <span dir="ltr">{row.customer.phone}</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              {row.total.toLocaleString("fa-IR")} تومان
            </p>
            <select
              value={row.status}
              onChange={(e) =>
                void updateStatus(row.id, e.target.value as OrderStatus)
              }
              className="mt-3 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm"
              aria-label={`وضعیت سفارش ${row.id}`}
            >
              {STATUS_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="mt-3 flex gap-2">
              <AdminButton
                href={hajiasalPath(`/admin/orders/${row.id}`)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                جزئیات
              </AdminButton>
              <AdminButton
                href={`/api/orders/${row.id}/invoice?print=1`}
                variant="outline"
                size="sm"
                external
                target="_blank"
                className="flex-1"
              >
                فاکتور
              </AdminButton>
            </div>
          </li>
        ))}
        {!loading && filteredOrders.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
            سفارشی یافت نشد
          </li>
        ) : null}
      </ul>

      <div className="hidden md:block">
        <DataTable
          data={filteredOrders}
          rowKey={(row) => row.id}
          emptyMessage="سفارشی یافت نشد"
          minWidth={720}
          columns={[
            {
              key: "id",
              header: "شناسه",
              render: (row) => (
                <Link
                  href={hajiasalPath(`/admin/orders/${row.id}`)}
                  className="font-mono text-xs text-sky-700 hover:underline"
                  dir="ltr"
                >
                  {row.id}
                </Link>
              ),
            },
            {
              key: "customer",
              header: "مشتری",
              render: (row) => (
                <div>
                  <p className="font-medium">{row.customer.fullName}</p>
                  <p className="text-xs text-slate-400" dir="ltr">
                    {row.customer.phone}
                  </p>
                </div>
              ),
            },
            {
              key: "city",
              header: "شهر",
              hideOnMobile: true,
              render: (row) => row.customer.city,
            },
            {
              key: "total",
              header: "مبلغ",
              render: (row) => `${row.total.toLocaleString("fa-IR")} تومان`,
            },
            {
              key: "date",
              header: "تاریخ",
              hideOnMobile: true,
              render: (row) =>
                new Date(row.createdAt).toLocaleDateString("fa-IR"),
            },
            {
              key: "status",
              header: "وضعیت",
              render: (row) => (
                <select
                  value={row.status}
                  onChange={(e) =>
                    void updateStatus(row.id, e.target.value as OrderStatus)
                  }
                  className="h-10 min-w-[9rem] rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  aria-label={`وضعیت سفارش ${row.id}`}
                >
                  {STATUS_OPTIONS.filter((o) => o.value !== "all").map(
                    (opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ),
                  )}
                </select>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="flex items-center gap-1">
                  <AdminButton
                    href={hajiasalPath(`/admin/orders/${row.id}`)}
                    variant="ghost"
                    size="sm"
                  >
                    جزئیات
                  </AdminButton>
                  <AdminButton
                    href={`/api/orders/${row.id}/invoice?print=1`}
                    variant="outline"
                    size="sm"
                    external
                    target="_blank"
                  >
                    فاکتور
                  </AdminButton>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

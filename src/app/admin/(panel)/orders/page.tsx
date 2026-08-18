"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
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
  const toast = useAdminToast();
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
        (order.customer?.fullName ?? "").toLowerCase().includes(query) ||
        (order.customer?.phone ?? "").includes(query) ||
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
      toast.success("وضعیت سفارش به‌روز شد");
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا در به‌روزرسانی";
      setError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
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
          <Can permission="reports.export">
            <AdminButton
              href="/api/admin/orders/export"
              variant="outline"
              size="sm"
              external
              className="w-full sm:w-auto"
            >
              خروجی CSV
            </AdminButton>
          </Can>
        </div>
      </div>

      <div className="panel-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
        <label className="relative flex-1">
          <Icon
            icon={MagnifyingGlass}
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو شناسه، نام یا تلفن..."
            className="panel-input pe-3 ps-9"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <Icon icon={Funnel} size={16} className="shrink-0 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as OrderStatus | "all")
            }
            className="panel-input sm:w-auto"
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

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="h-36 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50"
            />
          ))
        ) : (
          filteredOrders.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <Link
                href={hajiasalPath(`/admin/orders/${row.id}`)}
                className="font-mono text-xs text-sky-700"
                dir="ltr"
              >
                {row.id}
              </Link>
              <span className="text-xs text-zinc-400">
                {new Date(row.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
                  <p className="font-medium text-zinc-900">
                    {row.customer?.fullName || "—"}
                  </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {row.customer?.city ?? "—"}
              <span className="mx-1.5 text-zinc-300">·</span>
              <span dir="ltr">{row.customer?.phone ?? ""}</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-800">
              {row.total.toLocaleString("fa-IR")} تومان
            </p>
            <Can permission="orders.edit">
              <select
                value={row.status}
                onChange={(e) =>
                  void updateStatus(row.id, e.target.value as OrderStatus)
                }
                className="mt-3 h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm"
                aria-label={`وضعیت سفارش ${row.id}`}
              >
                {STATUS_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Can>
            <div className="mt-3 flex gap-2">
              <AdminButton
                href={hajiasalPath(`/admin/orders/${row.id}`)}
                variant="ghost"
                size="sm"
                className="flex-1"
              >
                جزئیات
              </AdminButton>
              <Can permission="orders.print">
                <AdminButton
                  href={`/api/orders/${row.id}/invoice`}
                  variant="outline"
                  size="sm"
                  external
                  target="_blank"
                  className="flex-1"
                >
                  فاکتور
                </AdminButton>
              </Can>
            </div>
          </li>
          ))
        )}
        {!loading && filteredOrders.length === 0 ? (
          <li className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
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
          loading={loading}
          error={error || null}
          onRetry={() => void loadOrders()}
          columns={[
            {
              key: "id",
              header: "شناسه",
              sortable: true,
              getSortValue: (row) => row.id,
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
              sortable: true,
              getSortValue: (row) => row.customer?.fullName ?? "",
              render: (row) => (
                <div>
                  <p className="font-medium">{row.customer?.fullName ?? "—"}</p>
                  <p className="text-xs text-zinc-400" dir="ltr">
                    {row.customer?.phone ?? ""}
                  </p>
                </div>
              ),
            },
            {
              key: "city",
              header: "شهر",
              hideOnMobile: true,
              getSortValue: (row) => row.customer?.city ?? "",
              sortable: true,
              render: (row) => row.customer?.city ?? "—",
            },
            {
              key: "total",
              header: "مبلغ",
              sortable: true,
              getSortValue: (row) => row.total,
              render: (row) => `${row.total.toLocaleString("fa-IR")} تومان`,
            },
            {
              key: "date",
              header: "تاریخ",
              hideOnMobile: true,
              sortable: true,
              getSortValue: (row) => new Date(row.createdAt).getTime(),
              render: (row) =>
                new Date(row.createdAt).toLocaleDateString("fa-IR"),
            },
            {
              key: "status",
              header: "وضعیت",
              sortable: true,
              getSortValue: (row) => row.status,
              render: (row) => (
                <Can permission="orders.edit">
                  <select
                    value={row.status}
                    onChange={(e) =>
                      void updateStatus(row.id, e.target.value as OrderStatus)
                    }
                    className="h-10 min-w-[9rem] rounded-lg border border-zinc-200 bg-white px-2 text-sm"
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
                </Can>
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
                  <Can permission="orders.print">
                    <AdminButton
                      href={`/api/orders/${row.id}/invoice`}
                      variant="outline"
                      size="sm"
                      external
                      target="_blank"
                    >
                      فاکتور
                    </AdminButton>
                  </Can>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

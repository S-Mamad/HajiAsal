"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import type { OrderStatus } from "@/lib/server/orders";

interface SellerOrder {
  id: string;
  status: OrderStatus;
  customer: { fullName: string; phone: string; city: string };
  sellerSubtotal: number;
  sellerItems: Array<{
    title: string;
    quantity: number;
    weight: { label: string };
  }>;
  createdAt: string;
  trackingCode?: string;
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/orders");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          فقط سفارش‌هایی که شامل محصولات شما هستند
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            className="w-full !border-stone-300 sm:w-auto"
          >
            بروزرسانی
          </AdminButton>
          <AdminButton
            href="/api/seller/orders/export"
            variant="outline"
            size="sm"
            external
            download
            className="w-full !border-stone-300 sm:w-auto"
          >
            خروجی CSV
          </AdminButton>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      ) : null}

      <ul className="space-y-3 md:hidden">
        {orders.map((r) => {
          const open = expanded === r.id;
          return (
            <li
              key={r.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <button
                type="button"
                className="w-full text-start"
                onClick={() => setExpanded(open ? null : r.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-stone-500" dir="ltr">
                    {r.id}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 font-medium text-stone-900">
                  {r.customer.fullName}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {r.customer.city} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString("fa-IR")}
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {r.sellerSubtotal.toLocaleString("fa-IR")} تومان
                </p>
              </button>
              {open ? (
                <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-xs text-stone-600">
                  {r.sellerItems.map((item, i) => (
                    <li key={`${r.id}-${i}`}>
                      {item.title} · {item.weight.label} ×{" "}
                      {item.quantity.toLocaleString("fa-IR")}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-3 flex gap-2">
                <AdminButton
                  href={`/api/orders/${r.id}/invoice?print=1`}
                  variant="outline"
                  size="sm"
                  external
                  target="_blank"
                  className="flex-1 !border-stone-300"
                >
                  مشاهده فاکتور
                </AdminButton>
                <AdminButton
                  href={`/api/orders/${r.id}/invoice?download=1`}
                  variant="ghost"
                  size="sm"
                  external
                  download
                  className="flex-1"
                >
                  دانلود
                </AdminButton>
              </div>
            </li>
          );
        })}
        {!loading && orders.length === 0 ? (
          <li className="rounded-xl border border-dashed border-stone-200 py-10 text-center text-sm text-stone-400">
            سفارشی یافت نشد
          </li>
        ) : null}
      </ul>

      <div className="hidden md:block">
        <DataTable
          data={orders}
          rowKey={(r) => r.id}
          emptyMessage="سفارشی یافت نشد"
          minWidth={880}
          className="!border-stone-200"
          columns={[
            {
              key: "id",
              header: "شناسه",
              render: (r) => (
                <span className="font-mono text-xs" dir="ltr">
                  {r.id}
                </span>
              ),
            },
            {
              key: "customer",
              header: "مشتری",
              render: (r) => (
                <div>
                  <p className="font-medium">{r.customer.fullName}</p>
                  <p className="text-xs text-stone-400">{r.customer.city}</p>
                </div>
              ),
            },
            {
              key: "items",
              header: "اقلام شما",
              render: (r) => (
                <ul className="space-y-0.5 text-xs text-stone-600">
                  {r.sellerItems.map((item, i) => (
                    <li key={`${r.id}-${i}`}>
                      {item.title} · {item.weight.label} ×{" "}
                      {item.quantity.toLocaleString("fa-IR")}
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              key: "total",
              header: "مبلغ سهم",
              render: (r) =>
                `${r.sellerSubtotal.toLocaleString("fa-IR")} تومان`,
            },
            {
              key: "status",
              header: "وضعیت",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "date",
              header: "تاریخ",
              render: (r) =>
                new Date(r.createdAt).toLocaleDateString("fa-IR"),
            },
            {
              key: "invoice",
              header: "فاکتور",
              render: (r) => (
                <div className="flex items-center gap-1">
                  <AdminButton
                    href={`/api/orders/${r.id}/invoice?print=1`}
                    variant="outline"
                    size="sm"
                    external
                    target="_blank"
                    className="!border-stone-300"
                  >
                    پرینت
                  </AdminButton>
                  <AdminButton
                    href={`/api/orders/${r.id}/invoice?download=1`}
                    variant="ghost"
                    size="sm"
                    external
                    download
                  >
                    دانلود
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

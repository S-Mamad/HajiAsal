"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { hajiasalPath } from "@/lib/paths";

interface DashboardData {
  kpis: {
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    unreadMessages: number;
    totalProducts: number;
    outOfStock: number;
    salesToday: number;
    salesWeek: number;
    salesMonth: number;
    customersCount: number;
    lowStockCount: number;
    avgOrderValue: number;
  };
  recentOrders: Array<{
    id: string;
    total: number;
    status: string;
    customer: { fullName?: string };
    createdAt: string;
  }>;
  recentMessages: Array<{
    id: string;
    name: string;
    subject?: string;
    createdAt: string;
  }>;
  recentCustomers: Array<{
    id: string;
    fullName?: string | null;
    phone: string;
  }>;
  salesChart: Array<{ date: string; total: number }>;
  ordersChart: Array<{ date: string; count: number }>;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("fa-IR").format(n) + " تومان";
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/dashboard", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطا در بارگذاری");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "داده‌ای نیست"}
        <button type="button" className="ms-3 underline" onClick={() => void load()}>
          تلاش مجدد
        </button>
      </div>
    );
  }

  const { kpis } = data;
  const maxSale = Math.max(1, ...data.salesChart.map((x) => x.total));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="فروش امروز" value={formatMoney(kpis.salesToday)} />
        <StatCard label="فروش هفته" value={formatMoney(kpis.salesWeek)} />
        <StatCard label="فروش ماه" value={formatMoney(kpis.salesMonth)} />
        <StatCard label="درآمد کل" value={formatMoney(kpis.totalRevenue)} />
        <StatCard label="سفارش‌ها" value={String(kpis.totalOrders)} />
        <StatCard label="مشتریان" value={String(kpis.customersCount)} />
        <StatCard label="محصولات" value={String(kpis.totalProducts)} />
        <StatCard
          label="کم‌موجود / ناموجود"
          value={String(kpis.lowStockCount || kpis.outOfStock)}
        />
        <StatCard label="میانگین سفارش" value={formatMoney(kpis.avgOrderValue)} />
        <StatCard label="در انتظار" value={String(kpis.pendingOrders)} />
        <StatCard label="پیام خوانده‌نشده" value={String(kpis.unreadMessages)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-stone-800">نمودار فروش (۱۴ روز)</h3>
          <div className="flex h-40 items-end gap-1">
            {data.salesChart.length === 0 ? (
              <p className="text-sm text-stone-400">داده‌ای نیست</p>
            ) : (
              data.salesChart.map((p) => (
                <div key={p.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-amber-700/80"
                    style={{ height: `${Math.max(4, (p.total / maxSale) * 100)}%` }}
                    title={formatMoney(p.total)}
                  />
                  <span className="text-[9px] text-stone-400 tabular-nums">
                    {p.date.slice(5)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">آخرین سفارش‌ها</h3>
            <Link
              href={hajiasalPath("/admin/orders")}
              className="text-xs text-amber-800 hover:underline"
            >
              همه
            </Link>
          </div>
          <ul className="divide-y divide-stone-100">
            {data.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-800">
                    {o.customer?.fullName ?? o.id}
                  </p>
                  <p className="text-xs text-stone-500 tabular-nums">
                    {formatMoney(o.total)}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-stone-800">آخرین پیام‌ها</h3>
          <ul className="space-y-2 text-sm">
            {data.recentMessages.map((m) => (
              <li key={m.id} className="rounded-xl bg-stone-50 px-3 py-2">
                <p className="font-medium text-stone-800">{m.name}</p>
                <p className="text-xs text-stone-500">{m.subject || "بدون موضوع"}</p>
              </li>
            ))}
            {data.recentMessages.length === 0 ? (
              <li className="text-stone-400">پیامی نیست</li>
            ) : null}
          </ul>
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-stone-800">آخرین مشتریان</h3>
          <ul className="space-y-2 text-sm">
            {(data.recentCustomers ?? []).map((c) => (
              <li key={c.id} className="flex justify-between rounded-xl bg-stone-50 px-3 py-2">
                <span>{c.fullName || "بدون نام"}</span>
                <span className="tabular-nums text-stone-500" dir="ltr">
                  {c.phone}
                </span>
              </li>
            ))}
            {(data.recentCustomers ?? []).length === 0 ? (
              <li className="text-stone-400">مشتری‌ای نیست</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CurrencyCircleDollar,
  Package,
  ShoppingBag,
  Users,
  Envelope,
  WarningCircle,
  ChartLine,
  ArrowLeft,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { hajiasalPath } from "@/lib/paths";
import { Icon } from "@/components/ui/Icon";

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
      const res = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-[var(--panel-radius,10px)] bg-zinc-200/60"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[var(--panel-radius,10px)] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "داده‌ای نیست"}
        <button
          type="button"
          className="ms-3 underline underline-offset-2"
          onClick={() => void load()}
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const { kpis } = data;
  const maxSale = Math.max(1, ...data.salesChart.map((x) => x.total));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="فروش امروز"
          value={formatMoney(kpis.salesToday)}
          icon={CurrencyCircleDollar}
          tone="amber"
        />
        <StatCard
          label="فروش هفته"
          value={formatMoney(kpis.salesWeek)}
          hint={`ماه: ${formatMoney(kpis.salesMonth)}`}
          icon={ChartLine}
          tone="emerald"
        />
        <StatCard
          label="سفارش در انتظار"
          value={String(kpis.pendingOrders)}
          hint={`از ${kpis.totalOrders.toLocaleString("fa-IR")} سفارش`}
          icon={Package}
          tone={kpis.pendingOrders > 0 ? "rose" : "slate"}
        />
        <StatCard
          label="کم‌موجود / ناموجود"
          value={String(kpis.lowStockCount || kpis.outOfStock)}
          icon={WarningCircle}
          tone={(kpis.lowStockCount || kpis.outOfStock) > 0 ? "rose" : "slate"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="درآمد کل"
          value={formatMoney(kpis.totalRevenue)}
          icon={CurrencyCircleDollar}
        />
        <StatCard
          label="میانگین سفارش"
          value={formatMoney(kpis.avgOrderValue)}
        />
        <StatCard
          label="مشتریان"
          value={String(kpis.customersCount)}
          icon={Users}
        />
        <StatCard
          label="محصولات"
          value={String(kpis.totalProducts)}
          hint={`${kpis.unreadMessages.toLocaleString("fa-IR")} پیام خوانده‌نشده`}
          icon={ShoppingBag}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="panel-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              فروش ۱۴ روز اخیر
            </h3>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs text-zinc-500 transition hover:text-zinc-800"
            >
              بروزرسانی
            </button>
          </div>
          <div className="flex h-44 items-end gap-1.5">
            {data.salesChart.length === 0 ? (
              <p className="text-sm text-zinc-400">داده‌ای نیست</p>
            ) : (
              data.salesChart.map((p) => (
                <div
                  key={p.date}
                  className="group flex flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    className="w-full rounded-t-md bg-[var(--panel-accent,#b45309)]/85 transition group-hover:bg-[var(--panel-accent,#b45309)]"
                    style={{
                      height: `${Math.max(6, (p.total / maxSale) * 100)}%`,
                    }}
                    title={formatMoney(p.total)}
                  />
                  <span className="text-[9px] tabular-nums text-zinc-400">
                    {p.date.slice(5)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">
              آخرین سفارش‌ها
            </h3>
            <Link
              href={hajiasalPath("/admin/orders")}
              className="inline-flex items-center gap-1 text-xs text-amber-800 transition hover:text-amber-950"
            >
              همه
              <Icon icon={ArrowLeft} size={12} />
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {data.recentOrders.length === 0 ? (
              <li className="py-8 text-center text-sm text-zinc-400">
                سفارشی نیست
              </li>
            ) : (
              data.recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-800">
                      {o.customer?.fullName ?? o.id}
                    </p>
                    <p className="text-[11px] tabular-nums text-zinc-500">
                      {formatMoney(o.total)}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Icon icon={Envelope} size={16} className="text-zinc-400" />
              آخرین پیام‌ها
            </h3>
            <Link
              href={hajiasalPath("/admin/messages")}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              صندوق پیام
            </Link>
          </div>
          <ul className="space-y-1.5 text-sm">
            {data.recentMessages.map((m) => (
              <li
                key={m.id}
                className="rounded-lg bg-zinc-50 px-3 py-2.5 transition hover:bg-zinc-100/80"
              >
                <p className="font-medium text-zinc-800">{m.name}</p>
                <p className="text-[11px] text-zinc-500">
                  {m.subject || "بدون موضوع"}
                </p>
              </li>
            ))}
            {data.recentMessages.length === 0 ? (
              <li className="py-6 text-center text-zinc-400">پیامی نیست</li>
            ) : null}
          </ul>
        </section>
        <section className="panel-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Icon icon={Users} size={16} className="text-zinc-400" />
              آخرین مشتریان
            </h3>
            <Link
              href={hajiasalPath("/admin/customers")}
              className="text-xs text-zinc-500 hover:text-zinc-800"
            >
              همه مشتریان
            </Link>
          </div>
          <ul className="space-y-1.5 text-sm">
            {(data.recentCustomers ?? []).map((c) => (
              <li
                key={c.id}
                className="flex justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5"
              >
                <span className="truncate font-medium text-zinc-800">
                  {c.fullName || "بدون نام"}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500" dir="ltr">
                  {c.phone}
                </span>
              </li>
            ))}
            {(data.recentCustomers ?? []).length === 0 ? (
              <li className="py-6 text-center text-zinc-400">مشتری‌ای نیست</li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

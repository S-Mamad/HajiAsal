"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ShoppingBag,
  CurrencyCircleDollar,
  WarningCircle,
  Wallet,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import type { OrderStatus } from "@/lib/server/orders";

interface Kpis {
  productCount: number;
  pendingProducts?: number;
  outOfStock: number;
  lowStockCount?: number;
  orderCount: number;
  pendingOrders: number;
  revenue: number;
  salesToday?: number;
  salesWeek?: number;
  salesMonth?: number;
  walletAvailable?: number;
  walletPending?: number;
}

interface SellerOrderRow {
  id: string;
  status: OrderStatus;
  customer: { fullName: string; phone: string };
  sellerSubtotal: number;
  createdAt: string;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/dashboard");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setKpis(data.kpis);
      setOrders(data.recentOrders ?? []);
      setShopName(data.seller?.shopName ?? "");
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">خلاصه عملکرد فروشگاه شما</p>
          {shopName ? (
            <p className="mt-0.5 text-base font-semibold tracking-tight text-zinc-900">
              {shopName}
            </p>
          ) : null}
        </div>
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void load()}
        >
          بروزرسانی
        </AdminButton>
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {loading && !kpis ? (
        <div className="space-y-6 animate-pulse" aria-busy>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-[var(--panel-radius,10px)] bg-zinc-200/70"
              />
            ))}
          </div>
          <div className="h-48 rounded-[var(--panel-radius,10px)] bg-zinc-200/70" />
        </div>
      ) : null}

      {kpis ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link href={hajiasalPath("/seller/reports")} className="block">
            <StatCard
              label="فروش امروز"
              value={`${(kpis.salesToday ?? 0).toLocaleString("fa-IR")} تومان`}
              hint={`هفته: ${(kpis.salesWeek ?? 0).toLocaleString("fa-IR")}`}
              icon={CurrencyCircleDollar}
              tone="amber"
            />
          </Link>
          <Link href={hajiasalPath("/seller/wallet")} className="block">
            <StatCard
              label="کیف پول"
              value={`${(kpis.walletAvailable ?? 0).toLocaleString("fa-IR")}`}
              hint={`در انتظار: ${(kpis.walletPending ?? 0).toLocaleString("fa-IR")}`}
              icon={Wallet}
              tone="slate"
            />
          </Link>
          <Link href={hajiasalPath("/seller/orders")} className="block">
            <StatCard
              label="سفارش‌ها"
              value={kpis.orderCount}
              hint={`${kpis.pendingOrders.toLocaleString("fa-IR")} در جریان`}
              icon={Package}
              tone="emerald"
            />
          </Link>
          <Link href={hajiasalPath("/seller/inventory")} className="block">
            <StatCard
              label="کم‌موجود"
              value={`${kpis.lowStockCount ?? kpis.outOfStock}`}
              hint={`${kpis.outOfStock} ناموجود · ${(kpis.revenue).toLocaleString("fa-IR")} درآمد کل`}
              icon={WarningCircle}
              tone={(kpis.lowStockCount ?? kpis.outOfStock) > 0 ? "rose" : "slate"}
            />
          </Link>
          <Link href={hajiasalPath("/seller/products")} className="block sm:col-span-2 xl:col-span-1">
            <StatCard
              label="محصولات من"
              value={kpis.productCount}
              hint={
                (kpis.pendingProducts ?? 0) > 0
                  ? `${kpis.pendingProducts!.toLocaleString("fa-IR")} در انتظار تأیید`
                  : undefined
              }
              icon={ShoppingBag}
              tone="slate"
            />
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">
            سفارش‌های اخیر
          </h3>
          <Link
            href={hajiasalPath("/seller/orders")}
            className="text-xs text-zinc-500 transition hover:text-zinc-900"
          >
            همه سفارش‌ها
          </Link>
        </div>
        <DataTable
          data={orders}
          rowKey={(r) => r.id}
          emptyMessage="هنوز سفارشی برای محصولات شما ثبت نشده"
          columns={[
            {
              key: "id",
              header: "شناسه",
              render: (r) => (
                <Link
                  href={hajiasalPath(`/seller/orders/${r.id}`)}
                  className="font-mono text-xs text-amber-900 hover:underline"
                  dir="ltr"
                >
                  {r.id}
                </Link>
              ),
            },
            {
              key: "customer",
              header: "مشتری",
              render: (r) => (
                <Link
                  href={hajiasalPath(`/seller/orders/${r.id}`)}
                  className="hover:underline"
                >
                  {r.customer.fullName}
                </Link>
              ),
            },
            {
              key: "total",
              header: "سهم شما",
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
          ]}
        />
      </section>
    </div>
  );
}

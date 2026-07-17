"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  ShoppingBag,
  CurrencyCircleDollar,
  WarningCircle,
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
  orderCount: number;
  pendingOrders: number;
  revenue: number;
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">خلاصه عملکرد فروشگاه شما</p>
          {shopName ? (
            <p className="mt-0.5 text-base font-medium text-stone-800">
              {shopName}
            </p>
          ) : null}
        </div>
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="!border-stone-300 !text-stone-800"
        >
          بروزرسانی
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading && !kpis ? (
        <div className="space-y-6 animate-pulse" aria-busy>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-stone-200/70" />
            ))}
          </div>
          <div className="h-48 rounded-2xl bg-stone-200/70" />
        </div>
      ) : null}

      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="درآمد فروشنده"
            value={`${kpis.revenue.toLocaleString("fa-IR")} تومان`}
            icon={CurrencyCircleDollar}
            tone="amber"
          />
          <StatCard
            label="سفارش‌ها"
            value={kpis.orderCount}
            hint={`${kpis.pendingOrders.toLocaleString("fa-IR")} در جریان`}
            icon={Package}
            tone="emerald"
          />
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
          <StatCard
            label="ناموجود"
            value={kpis.outOfStock}
            hint="نیاز به تأمین"
            icon={WarningCircle}
            tone={kpis.outOfStock > 0 ? "rose" : "slate"}
          />
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-stone-900">
            سفارش‌های اخیر
          </h3>
          <Link
            href={hajiasalPath("/seller/orders")}
            className="text-sm text-stone-600 hover:text-stone-900"
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
                <span className="font-mono text-xs" dir="ltr">
                  {r.id}
                </span>
              ),
            },
            {
              key: "customer",
              header: "مشتری",
              render: (r) => r.customer.fullName,
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

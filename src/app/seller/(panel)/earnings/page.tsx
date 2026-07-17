"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyCircleDollar, Package } from "@phosphor-icons/react";
import { StatCard } from "@/components/admin/ui/StatCard";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import type { OrderStatus } from "@/lib/server/orders";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

interface EarningsData {
  totalEarnings: number;
  monthEarnings: number;
  orderCount: number;
  byStatus: Record<string, number>;
  recent: Array<{
    id: string;
    status: OrderStatus;
    sellerSubtotal: number;
    createdAt: string;
    customer: { fullName: string };
  }>;
}

export default function SellerEarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/earnings");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطا");
      setData(json);
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
        <p className="text-sm text-stone-500">
          درآمد بر اساس سهم محصولات شما در سفارش‌ها
        </p>
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="!border-stone-300"
        >
          بروزرسانی
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="درآمد کل"
              value={`${data.totalEarnings.toLocaleString("fa-IR")} تومان`}
              icon={CurrencyCircleDollar}
              className="!border-stone-200"
            />
            <StatCard
              label="۳۰ روز اخیر"
              value={`${data.monthEarnings.toLocaleString("fa-IR")} تومان`}
              icon={CurrencyCircleDollar}
              className="!border-stone-200"
            />
            <StatCard
              label="تعداد سفارش"
              value={data.orderCount}
              icon={Package}
              className="!border-stone-200"
            />
          </div>

          <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div
                key={status}
                className="rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <p className="text-xs text-stone-500">
                  {STATUS_LABELS[status] ?? status}
                </p>
                <p className="text-lg font-semibold tabular-nums">
                  {count.toLocaleString("fa-IR")}
                </p>
              </div>
            ))}
          </section>

          <DataTable
            data={data.recent}
            rowKey={(r) => r.id}
            emptyMessage="تراکنشی نیست"
            columns={[
              {
                key: "id",
                header: "سفارش",
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
                key: "amount",
                header: "سهم",
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
        </>
      ) : null}
    </div>
  );
}

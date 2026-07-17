"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencyCircleDollar, Package } from "@phosphor-icons/react";
import { StatCard } from "@/components/admin/ui/StatCard";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

interface ReportsData {
  totalRevenue: number;
  orderCount: number;
  byStatus: Record<string, number>;
  topProducts: Array<{
    id: string;
    title: string;
    qty: number;
    revenue: number;
  }>;
  dailySeries: Array<{ date: string; total: number }>;
  productCount: number;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reports");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "خطا در بارگذاری");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const maxDaily = data
    ? Math.max(1, ...data.dailySeries.map((d) => d.total))
    : 1;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">گزارش فروش و عملکرد</p>
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void loadReports()}
        >
          بروزرسانی
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">در حال بارگذاری...</p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="درآمد (بدون لغو)"
              value={`${data.totalRevenue.toLocaleString("fa-IR")} تومان`}
              icon={CurrencyCircleDollar}
            />
            <StatCard
              label="تعداد سفارش"
              value={data.orderCount}
              icon={Package}
            />
            <StatCard label="محصولات" value={data.productCount} icon={Package} />
          </div>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              فروش ۳۰ روز اخیر
            </h3>
            {data.dailySeries.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                هنوز فروشی در ۳۰ روز اخیر ثبت نشده
              </p>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex h-40 items-end gap-1 overflow-x-auto">
                  {data.dailySeries.map((day) => (
                    <div
                      key={day.date}
                      className="flex min-w-[1.25rem] flex-1 flex-col items-center gap-1"
                      title={`${day.date}: ${day.total.toLocaleString("fa-IR")}`}
                    >
                      <div
                        className="w-full rounded-t bg-slate-800"
                        style={{
                          height: `${Math.max(4, (day.total / maxDaily) * 100)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">
                  هر ستون یک روز · مجموع فروش روزانه
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              وضعیت سفارش‌ها
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.byStatus).map(([status, count]) => (
                <div
                  key={status}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p className="text-xs text-slate-500">
                    {STATUS_LABELS[status] ?? status}
                  </p>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums">
                    {count.toLocaleString("fa-IR")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              پرفروش‌ترین محصولات
            </h3>
            <DataTable
              data={data.topProducts}
              rowKey={(row) => row.id}
              emptyMessage="داده‌ای موجود نیست"
              columns={[
                {
                  key: "title",
                  header: "محصول",
                  render: (row) => row.title,
                },
                {
                  key: "qty",
                  header: "تعداد",
                  render: (row) => row.qty.toLocaleString("fa-IR"),
                },
                {
                  key: "revenue",
                  header: "درآمد",
                  render: (row) =>
                    `${row.revenue.toLocaleString("fa-IR")} تومان`,
                },
              ]}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}

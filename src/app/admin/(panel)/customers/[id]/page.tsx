"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Icon } from "@/components/ui/Icon";
import type { OrderStatus } from "@/lib/server/orders";
import { hajiasalPath } from "@/lib/paths";

interface CustomerDetail {
  id: string;
  fullName: string | null;
  phone: string;
  email: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

interface CustomerOrder {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  trackingCode?: string;
  city: string;
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setCustomer(data.customer);
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">{error || "مشتری یافت نشد"}</p>
        <AdminButton href={hajiasalPath("/admin/customers")} variant="outline">
          بازگشت
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={hajiasalPath("/admin/customers")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <Icon icon={ArrowRight} size={16} />
          بازگشت به مشتریان
        </Link>
        <AdminButton type="button" variant="outline" onClick={() => void load()}>
          بروزرسانی
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">نام</p>
          <p className="mt-1 font-semibold text-slate-900">
            {customer.fullName ?? "بدون نام"}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">موبایل</p>
          <p className="mt-1 font-mono text-sm" dir="ltr">
            {customer.phone}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">تعداد سفارش</p>
          <p className="mt-1 text-lg font-semibold">
            {customer.orderCount.toLocaleString("fa-IR")}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">مجموع خرید</p>
          <p className="mt-1 text-lg font-semibold">
            {customer.totalSpent.toLocaleString("fa-IR")} تومان
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          سفارش‌های این مشتری
        </h3>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">سفارشی ثبت نشده است</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <Link
                    href={hajiasalPath(`/admin/orders/${order.id}`)}
                    className="font-mono text-xs text-slate-700 hover:underline"
                    dir="ltr"
                  >
                    {order.id}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {order.city} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-medium">
                    {order.total.toLocaleString("fa-IR")} تومان
                  </span>
                  <AdminButton
                    href={hajiasalPath(`/admin/orders/${order.id}`)}
                    variant="ghost"
                    size="sm"
                  >
                    جزئیات
                  </AdminButton>
                  <AdminButton
                    href={`/api/orders/${order.id}/invoice?print=1`}
                    variant="outline"
                    size="sm"
                    external
                    target="_blank"
                  >
                    فاکتور
                  </AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Package } from "@phosphor-icons/react";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Icon } from "@/components/ui/Icon";
import type { OrderStatus, StoredOrder } from "@/lib/server/orders";
import { hajiasalPath } from "@/lib/paths";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending_payment", label: "در انتظار پرداخت" },
  { value: "confirmed", label: "تأیید شده" },
  { value: "processing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "ارسال شده" },
  { value: "delivered", label: "تحویل شده" },
  { value: "cancelled", label: "لغو شده" },
];

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;

  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const updateStatus = async (status: OrderStatus) => {
    if (!order) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در به‌روزرسانی");
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در به‌روزرسانی");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">{error || "سفارش یافت نشد"}</p>
        <AdminButton href={hajiasalPath("/admin/orders")} variant="outline">
          بازگشت به لیست
        </AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={hajiasalPath("/admin/orders")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <Icon icon={ArrowRight} size={16} />
          بازگشت به سفارش‌ها
        </Link>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <AdminButton
            href={`/api/orders/${order.id}/invoice?print=1`}
            variant="outline"
            size="sm"
            external
            target="_blank"
            className="w-full sm:w-auto"
          >
            مشاهده / پرینت فاکتور
          </AdminButton>
          <AdminButton
            href={`/api/orders/${order.id}/invoice?download=1`}
            variant="outline"
            size="sm"
            external
            download
            className="w-full sm:w-auto"
          >
            دانلود فاکتور
          </AdminButton>
          <StatusBadge status={order.status} />
          <select
            value={order.status}
            disabled={saving}
            onChange={(e) => void updateStatus(e.target.value as OrderStatus)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm sm:w-auto"
            aria-label="تغییر وضعیت سفارش"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
            <Icon icon={Package} size={18} />
            اقلام سفارش
          </h3>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li
                key={`${item.productId}-${item.weight.grams}`}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.weight.label} × {item.quantity.toLocaleString("fa-IR")}
                  </p>
                </div>
                <p className="text-sm text-slate-700">
                  {(item.weight.price * item.quantity).toLocaleString("fa-IR")}{" "}
                  تومان
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">مشتری</h3>
              {order.userId || order.customer.phone ? (
                <AdminButton
                  href={hajiasalPath(
                    `/admin/customers/${order.userId ?? `guest-${order.customer.phone}`}`,
                  )}
                  variant="ghost"
                  size="sm"
                >
                  پروفایل
                </AdminButton>
              ) : null}
            </div>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-400">نام</dt>
                <dd className="text-slate-800">{order.customer.fullName}</dd>
              </div>
              <div>
                <dt className="text-slate-400">تلفن</dt>
                <dd dir="ltr" className="text-slate-800">
                  {order.customer.phone}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">شهر</dt>
                <dd className="text-slate-800">{order.customer.city}</dd>
              </div>
              <div>
                <dt className="text-slate-400">آدرس</dt>
                <dd className="text-slate-800">{order.customer.address}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">خلاصه</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">جمع جزء</dt>
                <dd>{order.subtotal.toLocaleString("fa-IR")} تومان</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">ارسال</dt>
                <dd>{order.shipping.toLocaleString("fa-IR")} تومان</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>تخفیف</dt>
                  <dd>-{order.discount.toLocaleString("fa-IR")} تومان</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold">
                <dt>مبلغ کل</dt>
                <dd>{order.total.toLocaleString("fa-IR")} تومان</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <dl className="space-y-2">
              <div>
                <dt className="text-slate-400">شناسه سفارش</dt>
                <dd dir="ltr" className="font-mono text-xs">
                  {order.id}
                </dd>
              </div>
              {order.trackingCode ? (
                <div>
                  <dt className="text-slate-400">کد پیگیری</dt>
                  <dd dir="ltr" className="font-mono text-xs">
                    {order.trackingCode}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-400">تاریخ ثبت</dt>
                <dd>
                  {new Date(order.createdAt).toLocaleString("fa-IR")}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">روش پرداخت</dt>
                <dd>
                  {order.paymentMethod === "cod"
                    ? "پرداخت در محل"
                    : order.paymentMethod === "online"
                      ? "پرداخت آنلاین"
                      : "کارت به کارت"}
                </dd>
              </div>
            </dl>
          </article>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Package } from "@phosphor-icons/react";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { ConfirmModal } from "@/components/admin/ui/AdminModal";
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
  const toast = useAdminToast();
  const orderId = params.id;

  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tracking, setTracking] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setOrder(data.order);
      setTracking(data.order.trackingCode ?? "");
      setAdminNote(data.order.adminNote ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const patchOrder = async (body: Record<string, unknown>) => {
    if (!order) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در به‌روزرسانی");
      setOrder(data.order);
      setTracking(data.order.trackingCode ?? "");
      setAdminNote(data.order.adminNote ?? "");
      toast.success("سفارش به‌روز شد");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در به‌روزرسانی";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-stone-500">در حال بارگذاری...</p>;
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
          className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
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
          >
            چاپ فاکتور
          </AdminButton>
          <AdminButton
            href={`/api/orders/${order.id}/invoice?download=1`}
            variant="outline"
            size="sm"
            external
            download
          >
            دانلود فاکتور
          </AdminButton>
          <StatusBadge status={order.status} />
          <Can permission="orders.edit">
            <select
              value={order.status}
              disabled={saving}
              onChange={(e) =>
                void patchOrder({ status: e.target.value as OrderStatus })
              }
              className="h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm sm:w-auto"
              aria-label="تغییر وضعیت سفارش"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Can>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-stone-900">
            <Icon icon={Package} size={18} />
            اقلام سفارش
          </h3>
          <ul className="divide-y divide-stone-100">
            {order.items.map((item) => (
              <li
                key={`${item.productId}-${item.weight.grams}`}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium text-stone-900">{item.title}</p>
                  <p className="text-xs text-stone-500">
                    {item.weight.label} × {item.quantity.toLocaleString("fa-IR")}
                  </p>
                </div>
                <p className="text-sm text-stone-700 tabular-nums">
                  {(item.weight.price * item.quantity).toLocaleString("fa-IR")}{" "}
                  تومان
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <article className="rounded-xl border border-stone-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-900">مشتری</h3>
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
                <dt className="text-stone-400">نام</dt>
                <dd className="text-stone-800">{order.customer.fullName}</dd>
              </div>
              <div>
                <dt className="text-stone-400">تلفن</dt>
                <dd dir="ltr" className="text-stone-800 tabular-nums">
                  {order.customer.phone}
                </dd>
              </div>
              <div>
                <dt className="text-stone-400">شهر</dt>
                <dd className="text-stone-800">{order.customer.city}</dd>
              </div>
              <div>
                <dt className="text-stone-400">آدرس</dt>
                <dd className="text-stone-800">{order.customer.address}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-900">ارسال و یادداشت</h3>
            <div className="space-y-3">
              <FormField label="کد رهگیری" tooltip="پس از ارسال مرسوله ثبت شود">
                <AdminInput
                  dir="ltr"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </FormField>
              <FormField label="یادداشت داخلی">
                <AdminTextarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </FormField>
              <Can permission="orders.edit">
                <AdminButton
                  disabled={saving}
                  onClick={() =>
                    void patchOrder({
                      trackingCode: tracking || null,
                      adminNote: adminNote || null,
                    })
                  }
                >
                  ذخیره رهگیری / یادداشت
                </AdminButton>
              </Can>
              <Can permission="orders.refund">
                <AdminButton
                  variant="danger"
                  disabled={saving || Boolean(order.refundedAt)}
                  onClick={() => setRefundOpen(true)}
                >
                  {order.refundedAt ? "بازپرداخت ثبت شده" : "ثبت بازپرداخت"}
                </AdminButton>
              </Can>
            </div>
          </article>

          <article className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-900">خلاصه</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone-400">جمع جزء</dt>
                <dd className="tabular-nums">
                  {order.subtotal.toLocaleString("fa-IR")} تومان
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-400">ارسال</dt>
                <dd className="tabular-nums">
                  {order.shipping.toLocaleString("fa-IR")} تومان
                </dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between text-emerald-700">
                  <dt>تخفیف</dt>
                  <dd className="tabular-nums">
                    -{order.discount.toLocaleString("fa-IR")} تومان
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-stone-100 pt-2 font-semibold">
                <dt>مبلغ کل</dt>
                <dd className="tabular-nums">
                  {order.total.toLocaleString("fa-IR")} تومان
                </dd>
              </div>
            </dl>
          </article>
        </section>
      </div>

      <ConfirmModal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        onConfirm={() => {
          setRefundOpen(false);
          void patchOrder({
            refund: true,
            refundNote: "ثبت بازپرداخت از پنل ادمین",
            status: "cancelled",
          });
        }}
        title="ثبت بازپرداخت"
        description="وضعیت سفارش به لغو شده تغییر می‌کند و بازپرداخت در لاگ ثبت می‌شود."
        confirmLabel="تأیید بازپرداخت"
        danger
        loading={saving}
      />
    </div>
  );
}

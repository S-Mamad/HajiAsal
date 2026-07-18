"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminInput, AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
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
  const toast = useAdminToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [wallet, setWallet] = useState({ balance: 0, points: 0 });
  const [notes, setNotes] = useState<
    Array<{ id: string; note: string; createdAt: string }>
  >([]);
  const [addresses, setAddresses] = useState<
    Array<{ id: string; city: string; address: string; province: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [balanceDelta, setBalanceDelta] = useState("0");
  const [pointsDelta, setPointsDelta] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setCustomer(data.customer);
      setOrders(data.orders ?? []);
      setWallet(data.wallet ?? { balance: 0, points: 0 });
      setNotes(data.notes ?? []);
      setAddresses(data.addresses ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const postAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("ذخیره شد");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-stone-500">در حال بارگذاری...</p>;
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
          className="inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
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
        <article className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400">نام</p>
          <p className="mt-1 font-semibold text-stone-900">
            {customer.fullName ?? "بدون نام"}
          </p>
        </article>
        <article className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400">موبایل</p>
          <p className="mt-1 font-mono text-sm tabular-nums" dir="ltr">
            {customer.phone}
          </p>
        </article>
        <article className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400">کیف پول</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {wallet.balance.toLocaleString("fa-IR")} تومان
          </p>
        </article>
        <article className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-400">امتیاز</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {wallet.points.toLocaleString("fa-IR")}
          </p>
        </article>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Can permission="customers.edit">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">تنظیم کیف پول / امتیاز</h3>
            <div className="space-y-3">
              <FormField label="تغییر موجودی (مثبت/منفی)">
                <AdminInput
                  dir="ltr"
                  value={balanceDelta}
                  onChange={(e) => setBalanceDelta(e.target.value)}
                />
              </FormField>
              <FormField label="تغییر امتیاز">
                <AdminInput
                  dir="ltr"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                />
              </FormField>
              <AdminButton
                disabled={saving}
                onClick={() =>
                  void postAction({
                    action: "wallet",
                    balanceDelta: Number(balanceDelta) || 0,
                    pointsDelta: Number(pointsDelta) || 0,
                  })
                }
              >
                اعمال
              </AdminButton>
            </div>
          </section>
        </Can>

        <Can permission="customers.edit">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold">یادداشت مدیر</h3>
            <FormField label="متن یادداشت">
              <AdminTextarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </FormField>
            <AdminButton
              className="mt-3"
              disabled={saving || !noteText.trim()}
              onClick={() =>
                void postAction({ action: "note", note: noteText.trim() }).then(
                  () => setNoteText(""),
                )
              }
            >
              ذخیره یادداشت
            </AdminButton>
            <ul className="mt-4 space-y-2 text-sm">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-stone-50 px-3 py-2">
                  <p>{n.note}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {new Date(n.createdAt).toLocaleString("fa-IR")}
                  </p>
                </li>
              ))}
              {notes.length === 0 ? (
                <li className="text-stone-400">یادداشتی نیست</li>
              ) : null}
            </ul>
          </section>
        </Can>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-stone-900">آدرس‌ها</h3>
        {addresses.length === 0 ? (
          <p className="text-sm text-stone-500">آدرسی ثبت نشده</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-lg bg-stone-50 px-3 py-2">
                {a.province} · {a.city} · {a.address}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="mb-4 text-base font-semibold text-stone-900">
          سفارش‌های این مشتری ({customer.orderCount.toLocaleString("fa-IR")})
        </h3>
        {orders.length === 0 ? (
          <p className="text-sm text-stone-500">سفارشی ثبت نشده است</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <Link
                    href={hajiasalPath(`/admin/orders/${order.id}`)}
                    className="font-mono text-xs text-stone-700 hover:underline"
                    dir="ltr"
                  >
                    {order.id}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    {order.city} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-medium tabular-nums">
                    {order.total.toLocaleString("fa-IR")} تومان
                  </span>
                  <AdminButton
                    href={hajiasalPath(`/admin/orders/${order.id}`)}
                    variant="ghost"
                    size="sm"
                  >
                    جزئیات
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

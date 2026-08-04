"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { StatusBadge, STATUS_LABELS } from "@/components/admin/ui/StatusBadge";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

type OrderDetail = {
  id: string;
  status: string;
  soleOwner?: boolean;
  customer: { fullName: string; phone: string; city: string; address: string };
  sellerItems: Array<{ title: string; quantity: number; price: number }>;
  sellerSubtotal: number;
  trackingCode?: string;
  createdAt: string;
};

export default function SellerOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [canManageStatus, setCanManageStatus] = useState(false);
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/orders?id=${params.id}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      if (res.status === 404) {
        router.push(hajiasalPath("/seller/orders"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری سفارش");
      setOrder(data.order);
      setCanManageStatus(Boolean(data.canManageStatus));
      setNote(data.note ?? "");
      setTracking(data.order?.trackingCode ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setMessage("");
    const res = await fetch("/api/seller/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: params.id, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessageOk(false);
      setMessage(data.error ?? "خطا");
      return;
    }
    setMessageOk(true);
    setMessage("انجام شد");
    await load();
  };

  if (loading) {
    return <p className="text-sm text-stone-500">در حال بارگذاری...</p>;
  }

  if (error || !order) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error || "سفارش یافت نشد"}
        </p>
        <AdminButton
          variant="outline"
          href={hajiasalPath("/seller/orders")}
        >
          بازگشت به سفارش‌ها
        </AdminButton>
      </div>
    );
  }

  const statusHint =
    order.status === "pending_payment"
      ? "این سفارش هنوز پرداخت نشده؛ تأیید/آماده‌سازی پس از پرداخت ممکن است."
      : order.soleOwner === false
        ? "این سفارش چندفروشنده‌ای است؛ تغییر وضعیت فقط توسط مدیر انجام می‌شود. می‌توانید یادداشت بگذارید."
        : null;

  return (
    <div className="space-y-4">
      {message ? (
        <p
          className={`text-sm ${messageOk ? "text-emerald-700" : "text-red-600"}`}
        >
          {message}
        </p>
      ) : null}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">سفارش {order.id}</h3>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {STATUS_LABELS[order.status] ?? order.status}
          {order.soleOwner === false ? " · چندفروشنده‌ای" : ""}
        </p>
        {statusHint ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {statusHint}
          </p>
        ) : null}
        <p className="mt-2 text-sm">
          {order.customer.fullName} · {order.customer.phone}
        </p>
        <p className="text-sm text-stone-600">
          {order.customer.city} · {order.customer.address}
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {order.sellerItems.map((item, idx) => (
            <li key={idx}>
              {item.title} × {item.quantity}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold tabular-nums">
          {order.sellerSubtotal.toLocaleString("fa-IR")} تومان
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canManageStatus ? (
          <>
            <AdminButton onClick={() => void act("confirm")}>تأیید</AdminButton>
            <AdminButton variant="outline" onClick={() => void act("prepare")}>
              آماده‌سازی
            </AdminButton>
          </>
        ) : null}
        <AdminButton
          variant="outline"
          href={`/api/orders/${order.id}/invoice?print=1`}
          external
          target="_blank"
        >
          چاپ فاکتور
        </AdminButton>
      </div>

      {canManageStatus ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-stone-200 bg-white p-4">
          <Input
            label="کد رهگیری"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
          <AdminButton
            onClick={() => void act("tracking", { trackingCode: tracking })}
            disabled={!tracking}
          >
            ثبت رهگیری
          </AdminButton>
        </div>
      ) : null}

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <Input
          label="یادداشت فروشنده"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <AdminButton
          className="mt-3"
          variant="outline"
          onClick={() => void act("note", { note })}
        >
          ذخیره یادداشت
        </AdminButton>
      </div>
    </div>
  );
}

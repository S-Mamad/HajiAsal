"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

type OrderDetail = {
  id: string;
  status: string;
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
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
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
    setOrder(data.order);
    setNote(data.note ?? "");
    setTracking(data.order?.trackingCode ?? "");
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
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "خطا");
      return;
    }
    setMessage("انجام شد");
    await load();
  };

  const printInvoice = () => {
    if (!order) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html dir="rtl"><body style="font-family:Tahoma;padding:24px">
      <h1>فاکتور فروشنده</h1>
      <p>سفارش ${order.id}</p>
      <p>${order.customer.fullName} · ${order.customer.phone}</p>
      <p>${order.customer.city} · ${order.customer.address}</p>
      <ul>${order.sellerItems.map((i) => `<li>${i.title} × ${i.quantity}</li>`).join("")}</ul>
      <p>جمع: ${order.sellerSubtotal.toLocaleString("fa-IR")} تومان</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (!order) return <p className="text-sm text-stone-500">...</p>;

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-lg font-semibold">سفارش {order.id}</h3>
        <p className="mt-1 text-sm text-stone-600">وضعیت: {order.status}</p>
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
        <AdminButton onClick={() => void act("confirm")}>تأیید</AdminButton>
        <AdminButton variant="outline" onClick={() => void act("prepare")}>
          آماده‌سازی
        </AdminButton>
        <AdminButton variant="outline" onClick={printInvoice}>
          چاپ فاکتور
        </AdminButton>
      </div>

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

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <Input label="یادداشت فروشنده" value={note} onChange={(e) => setNote(e.target.value)} />
        <AdminButton className="mt-3" variant="outline" onClick={() => void act("note", { note })}>
          ذخیره یادداشت
        </AdminButton>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Package, MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

interface OrderInfo {
  id: string;
  status: string;
  trackingCode: string;
  total: number;
  createdAt: string;
  items: Array<{ title: string; quantity: number; weight: string }>;
}

const statusLabels: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  confirmed: "تأیید شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  pending: "در انتظار پرداخت",
  paid: "پرداخت شده",
};

export default function TrackOrderPage() {
  const [tracking, setTracking] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const params = new URLSearchParams({
        tracking: tracking.trim(),
      });
      if (phone.trim()) params.set("phone", phone.trim());
      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "سفارش یافت نشد");
        return;
      }
      setOrder(data.order);
    } catch {
      setError("خطا در پیگیری سفارش");
    } finally {
      setLoading(false);
    }
  };

  const invoiceQuery =
    order && phone.trim()
      ? `?print=1&phone=${encodeURIComponent(phone.trim())}&tracking=${encodeURIComponent(order.trackingCode)}`
      : null;

  const invoiceDownloadQuery =
    order && phone.trim()
      ? `?download=1&phone=${encodeURIComponent(phone.trim())}&tracking=${encodeURIComponent(order.trackingCode)}`
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-16 md:px-8 md:py-24">
      <SectionHeading
        title="پیگیری سفارش"
        subtitle="کد پیگیری و شماره موبایل سفارش را وارد کنید"
        className="mb-8"
      />
      <form onSubmit={handleTrack} className="mb-8 space-y-3">
        <Input
          placeholder="TRK-XXXXXXXX"
          dir="ltr"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          required
        />
        <Input
          placeholder="۰۹۱۲xxxxxxx"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />
        <Button type="submit" disabled={loading} className="w-full">
          <Icon icon={MagnifyingGlass} size={16} />
          پیگیری
        </Button>
      </form>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {order ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-dim">
              <Icon icon={Package} size={18} className="text-gold" />
            </div>
            <div>
              <p className="font-medium text-primary" dir="ltr">
                {order.id}
              </p>
              <p className="text-sm text-secondary">
                {statusLabels[order.status] ?? order.status}
              </p>
            </div>
          </div>
          <p className="mb-2 text-sm text-secondary">
            کد پیگیری:{" "}
            <span dir="ltr" className="font-mono text-primary">
              {order.trackingCode}
            </span>
          </p>
          <p className="mb-4 text-sm font-semibold text-gold">
            {formatPrice(order.total)}
          </p>
          <ul className="border-t border-border pt-4 text-sm text-secondary">
            {order.items.map((item, i) => (
              <li key={i} className="py-1">
                {item.title}، {item.weight} ×{" "}
                {item.quantity.toLocaleString("fa-IR")}
              </li>
            ))}
          </ul>
          {invoiceQuery && invoiceDownloadQuery ? (
            <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-4">
              <a
                href={`/api/orders/${order.id}/invoice${invoiceQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber hover:underline"
              >
                مشاهده / پرینت فاکتور
              </a>
              <a
                href={`/api/orders/${order.id}/invoice${invoiceDownloadQuery}`}
                download
                className="text-sm text-muted hover:text-primary hover:underline"
              >
                دانلود فاکتور
              </a>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted">
              برای دانلود فاکتور، شماره موبایل سفارش را هم وارد کنید.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Package, MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Icon } from "@/components/ui/Icon";
import { OrderStatusStepper } from "@/components/orders/OrderStatusStepper";
import { formatPrice } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

interface OrderInfo {
  id: string;
  status: string;
  trackingCode: string;
  total: number;
  createdAt: string;
  refundedAt?: string;
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
  refunded: "بازپرداخت شده",
};

function TrackOrderInner() {
  const searchParams = useSearchParams();
  const [tracking, setTracking] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const runTrack = useCallback(async (code: string, phoneValue: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const params = new URLSearchParams({ tracking: trimmed });
      if (phoneValue.trim()) params.set("phone", phoneValue.trim());
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
  }, []);

  useEffect(() => {
    const qTracking = searchParams.get("tracking")?.trim() ?? "";
    const qPhone = searchParams.get("phone")?.trim() ?? "";
    if (!qTracking) return;
    setTracking(qTracking);
    if (qPhone) setPhone(qPhone);
    if (!autoTried) {
      setAutoTried(true);
      void runTrack(qTracking, qPhone);
    }
  }, [searchParams, autoTried, runTrack]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await runTrack(tracking, phone);
  };

  const invoiceAuthQuery =
    order && phone.trim()
      ? `phone=${encodeURIComponent(phone.trim())}&tracking=${encodeURIComponent(order.trackingCode)}`
      : null;

  const statusText = order?.refundedAt
    ? statusLabels.refunded
    : statusLabels[order?.status ?? ""] ?? order?.status;

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
          {loading ? "در حال جستجو..." : "پیگیری"}
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
              <p className="text-sm text-secondary">{statusText}</p>
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
          <div className="mb-5 border-t border-border pt-4">
            <OrderStatusStepper status={order.refundedAt ? "refunded" : order.status} />
          </div>
          <ul className="border-t border-border pt-4 text-sm text-secondary">
            {order.items.map((item, i) => (
              <li key={i} className="py-1">
                {item.title}، {item.weight} ×{" "}
                {item.quantity.toLocaleString("fa-IR")}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            <Button
              href={`${hajiasalPath("/contact")}?orderId=${encodeURIComponent(order.id)}&tracking=${encodeURIComponent(order.trackingCode)}`}
              variant="outline"
              className="w-full"
            >
              پشتیبانی این سفارش
            </Button>
            <p className="text-[11px] text-dim">
              مهمان‌ها از تماس پشتیبانی استفاده می‌کنند؛ پس از ورود می‌توانید تیکت
              ثبت کنید. شناسه سفارش در لینک همراه است.
            </p>
          </div>
          {invoiceAuthQuery ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={`/api/orders/${order.id}/invoice?${invoiceAuthQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber hover:underline"
              >
                مشاهده فاکتور
              </a>
              <a
                href={`/api/orders/${order.id}/invoice?download=1&${invoiceAuthQuery}`}
                download={`invoice-${order.id}.pdf`}
                className="text-sm text-muted hover:text-primary hover:underline"
              >
                دانلود PDF
              </a>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted">
              برای دانلود فاکتور، شماره موبایل سفارش را هم وارد کنید.
            </p>
          )}
          <p className="mt-4 text-[11px] leading-relaxed text-dim">
            لغو یا مرجوعی پس از شروع آماده‌سازی فقط از طریق پشتیبانی ممکن است.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <TrackOrderInner />
    </Suspense>
  );
}

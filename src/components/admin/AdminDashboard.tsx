"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { OrderStatus } from "@/lib/server/orders";
import type { ContactMessage } from "@/lib/server/newsletter";

interface AdminOrder {
  id: string;
  status: OrderStatus;
  userId?: string;
  customer: { fullName: string; phone: string; city: string };
  total: number;
  createdAt: string;
  trackingCode?: string;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "pending_payment", label: "در انتظار پرداخت" },
  { value: "confirmed", label: "تأیید شده" },
  { value: "processing", label: "در حال آماده‌سازی" },
  { value: "shipped", label: "ارسال شده" },
  { value: "delivered", label: "تحویل شده" },
  { value: "cancelled", label: "لغو شده" },
];

export function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "خطا در بارگذاری");
      setOrders(data.orders ?? []);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/orders");
        if (!active) return;
        if (res.status === 401) {
          router.refresh();
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? data.message ?? "خطا در بارگذاری");
        setOrders(data.orders ?? []);
        setMessages(data.messages ?? []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "خطای ناشناخته");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.message ?? "خطا در به‌روزرسانی");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در به‌روزرسانی");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title="پنل مدیریت" subtitle="سفارش‌ها و پیام‌های تماس" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void loadData()}>
            بروزرسانی
          </Button>
          <Button href="/api/admin/orders/export" variant="outline">
            خروجی CSV
          </Button>
          <Button type="button" variant="outline" onClick={handleLogout}>
            خروج
          </Button>
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-muted">در حال بارگذاری...</p> : null}

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold text-brown">سفارش‌ها</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-cream text-start text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">شناسه</th>
                <th className="px-4 py-3 font-medium">مشتری</th>
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">مبلغ</th>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    سفارشی ثبت نشده است
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                      {order.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brown">{order.customer.fullName}</p>
                      <p className="text-xs text-muted" dir="ltr">
                        {order.customer.phone}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {order.userId ? (
                        <p className="font-mono text-xs text-muted" dir="ltr" title={order.userId}>
                          {order.userId.slice(0, 8)}…
                        </p>
                      ) : (
                        <span className="text-xs text-muted">مهمان</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.total.toLocaleString("fa-IR")} تومان
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(order.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateStatus(order.id, e.target.value as OrderStatus)
                        }
                        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs"
                        aria-label={`وضعیت سفارش ${order.id}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-brown">پیام‌های تماس</h2>
        <div className="flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-muted">پیامی دریافت نشده است</p>
          ) : (
            messages.map((msg) => (
              <article
                key={msg.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-brown">{msg.name}</p>
                  <time className="text-xs text-muted">
                    {new Date(msg.createdAt).toLocaleDateString("fa-IR")}
                  </time>
                </div>
                <p className="text-xs text-muted">
                  {msg.subject} · <span dir="ltr">{msg.phone}</span> · {msg.email}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{msg.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

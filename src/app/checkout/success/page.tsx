"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Copy, WarningCircle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import {
  PaymentResultView,
  paymentMethodLabel,
  formatToman,
} from "@/components/checkout/PaymentResultView";
import { hajiasalPath } from "@/lib/paths";
import { useCartStore } from "@/store/cart";

const PAID_STATUSES = new Set([
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

function ConfettiBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full bg-gold"
          style={{ left: `${8 + ((i * 5) % 84)}%`, top: "20%" }}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: 180 + (i % 5) * 20, opacity: 0, scale: 0.4 }}
          transition={{ duration: 1.4 + (i % 4) * 0.1, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") ?? "";
  const trackingCode = searchParams.get("tracking") ?? "";
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<"loading" | "ok" | "unpaid" | "error">(
    "loading",
  );
  const [resolvedTracking, setResolvedTracking] = useState(trackingCode);
  const [copied, setCopied] = useState(false);
  const [paidTotal, setPaidTotal] = useState<number | null>(null);
  const [paidMethod, setPaidMethod] = useState<string | null>(null);
  const [shipments, setShipments] = useState<
    Array<{ sellerId?: string; count: number }>
  >([]);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/orders?id=${encodeURIComponent(orderId)}${
            trackingCode
              ? `&tracking=${encodeURIComponent(trackingCode)}`
              : ""
          }`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.order) {
          setState("error");
          return;
        }
        if (typeof data.order.total === "number") {
          setPaidTotal(data.order.total);
        }
        if (typeof data.order.paymentMethod === "string") {
          setPaidMethod(data.order.paymentMethod);
        }
        const status = String(data.order.status ?? "");
        if (data.order.trackingCode) {
          setResolvedTracking(String(data.order.trackingCode));
        }
        const items = (data.order.items ?? []) as Array<{ sellerId?: string }>;
        const bySeller = new Map<string, number>();
        for (const item of items) {
          const key = item.sellerId || "default";
          bySeller.set(key, (bySeller.get(key) ?? 0) + 1);
        }
        setShipments(
          Array.from(bySeller.entries()).map(([sellerId, count]) => ({
            sellerId: sellerId === "default" ? undefined : sellerId,
            count,
          })),
        );
        if (PAID_STATUSES.has(status)) {
          clearCart();
          setState("ok");
        } else {
          setState("unpaid");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, trackingCode, clearCart]);

  const copyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (state === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto text-secondary">
        در حال تأیید سفارش...
      </div>
    );
  }

  if (state === "unpaid") {
    return (
      <PaymentResultView
        kind="pending"
        orderId={orderId || undefined}
        amount={paidTotal}
        paymentMethod={paidMethod}
      />
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 py-20 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface">
          <WarningCircle size={32} weight="fill" className="text-gold" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-primary">سفارش یافت نشد</h1>
        <p className="mb-6 text-sm text-secondary">
          لینک بازگشت از درگاه نامعتبر است.
        </p>
        <Button href={hajiasalPath("/checkout")}>بازگشت به پرداخت</Button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 py-16 text-center">
      <ConfettiBurst />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success"
      >
        <CheckCircle size={44} weight="fill" />
      </motion.div>
      <h1 className="mb-2 text-2xl font-bold text-primary">پرداخت موفق بود</h1>
      <p className="mb-6 text-sm text-secondary">
        از خرید شما سپاسگزاریم. سفارش در حال پردازش است.
      </p>

      <div className="mb-6 w-full rounded-2xl border border-border bg-surface p-4 text-start">
        <p className="text-xs text-secondary">شماره سفارش</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="font-mono text-lg font-semibold text-primary" dir="ltr">
            {orderId}
          </p>
          <button
            type="button"
            onClick={() => void copyOrderId()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gold hover:bg-gold-dim"
          >
            <Copy size={14} />
            {copied ? "کپی شد" : "کپی"}
          </button>
        </div>
        {resolvedTracking ? (
          <p className="mt-3 text-xs text-secondary">
            کد پیگیری:{" "}
            <span className="font-mono text-primary" dir="ltr">
              {resolvedTracking}
            </span>
          </p>
        ) : null}
        {paidTotal != null ? (
          <p className="mt-3 text-xs text-secondary">
            مبلغ:{" "}
            <span className="font-semibold text-primary">
              {formatToman(paidTotal)}
            </span>
          </p>
        ) : null}
        {paidMethod ? (
          <p className="mt-1 text-xs text-secondary">
            روش پرداخت:{" "}
            <span className="text-primary">
              {paymentMethodLabel(paidMethod)}
            </span>
          </p>
        ) : null}
      </div>

      <ol className="mb-6 flex w-full items-center gap-2 text-xs">
        <li className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-success/30 bg-success/10 px-2 py-3 text-success">
          <CheckCircle size={18} weight="fill" />
          پرداخت موفق
        </li>
        <li className="h-px flex-1 bg-border" aria-hidden />
        <li className="flex flex-1 flex-col items-center gap-1 rounded-xl border border-gold/40 bg-gold-dim px-2 py-3 text-gold">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          در حال پردازش در انبار
        </li>
      </ol>

      {shipments.length > 1 ? (
        <div className="mb-6 w-full space-y-2 text-start">
          <p className="text-sm font-medium text-primary">
            این سفارش در {shipments.length.toLocaleString("fa-IR")} مرسوله جداگانه
            ارسال می‌شود
          </p>
          {shipments.map((s, idx) => (
            <div
              key={s.sellerId ?? idx}
              className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-secondary"
            >
              مرسوله {(idx + 1).toLocaleString("fa-IR")} ·{" "}
              {s.count.toLocaleString("fa-IR")} قلم
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 text-xs text-secondary">
          سفارش شما در یک مرسوله ارسال خواهد شد.
        </p>
      )}

      <div className="flex w-full flex-col gap-2">
        <Button
          href={hajiasalPath("/account/orders")}
          className="w-full"
        >
          مشاهده سفارش
        </Button>
        <Button
          href={
            resolvedTracking
              ? `${hajiasalPath("/track-order")}?tracking=${encodeURIComponent(resolvedTracking)}`
              : hajiasalPath("/account/orders")
          }
          variant="outline"
          className="w-full"
        >
          پیگیری سفارش
        </Button>
        <Button href={hajiasalPath("/shop")} variant="ghost" className="w-full">
          بازگشت به فروشگاه
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto text-secondary">
          در حال بارگذاری...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

"use client";

import {
  CheckCircle,
  Clock,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

export type PaymentResultKind = "failed" | "cancelled" | "pending";

const COPY: Record<
  PaymentResultKind,
  {
    title: string;
    body: string;
    retryLabel: string;
  }
> = {
  failed: {
    title: "پرداخت ناموفق بود",
    body: "مبلغ از درگاه تأیید نشد. اگر از حساب کسر شده، چند دقیقه دیگر وضعیت سفارش را بررسی کنید یا دوباره تلاش کنید.",
    retryLabel: "تلاش مجدد پرداخت",
  },
  cancelled: {
    title: "پرداخت لغو شد",
    body: "بازگشت از درگاه بدون پرداخت ثبت شد. سبد خرید شما محفوظ است و می‌توانید پرداخت را از نو شروع کنید.",
    retryLabel: "بازگشت به پرداخت",
  },
  pending: {
    title: "پرداخت در حال تأیید است",
    body: "نتیجه از درگاه هنوز قطعی نیست. این صفحه را ببندید و چند دقیقه بعد سفارش را در حساب کاربری بررسی کنید.",
    retryLabel: "بررسی دوباره",
  },
};

export function paymentMethodLabel(method?: string | null): string {
  if (method === "snappay") return "اسنپ‌پی";
  if (method === "online") return "زیبال (آنلاین)";
  return "پرداخت آنلاین";
}

export function formatToman(amount: number): string {
  return `${Math.round(amount).toLocaleString("fa-IR")} تومان`;
}

export function PaymentResultView({
  kind,
  orderId,
  amount,
  paymentMethod,
}: {
  kind: PaymentResultKind;
  orderId?: string;
  amount?: number | null;
  paymentMethod?: string | null;
}) {
  const copy = COPY[kind];
  const checkoutHref = orderId
    ? `${hajiasalPath("/checkout")}?payment=resume&orderId=${encodeURIComponent(orderId)}`
    : hajiasalPath("/checkout");
  const retryHref =
    kind === "pending"
      ? orderId
        ? `${hajiasalPath("/checkout/success")}?orderId=${encodeURIComponent(orderId)}`
        : hajiasalPath("/account/orders")
      : checkoutHref;

  const Icon =
    kind === "pending" ? Clock : kind === "cancelled" ? XCircle : WarningCircle;
  const iconClass =
    kind === "pending"
      ? "bg-amber-500/15 text-amber-700"
      : "bg-rose-500/10 text-rose-700";

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 py-16 text-center"
      data-testid={`payment-result-${kind}`}
    >
      <div
        className={`mb-6 flex h-16 w-16 items-center justify-center rounded-full ${iconClass}`}
      >
        <Icon size={32} weight="fill" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-primary">{copy.title}</h1>
      <p className="mb-6 text-sm leading-7 text-secondary">{copy.body}</p>

      {orderId || amount != null || paymentMethod ? (
        <div className="mb-6 w-full rounded-2xl border border-border bg-surface p-4 text-start text-sm">
          {orderId ? (
            <p>
              <span className="text-secondary">شماره سفارش: </span>
              <span className="font-mono font-semibold text-primary" dir="ltr">
                {orderId}
              </span>
            </p>
          ) : null}
          {amount != null ? (
            <p className="mt-2">
              <span className="text-secondary">مبلغ: </span>
              <span className="font-semibold text-primary">
                {formatToman(amount)}
              </span>
            </p>
          ) : null}
          {paymentMethod ? (
            <p className="mt-2">
              <span className="text-secondary">روش پرداخت: </span>
              <span className="text-primary">
                {paymentMethodLabel(paymentMethod)}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-2">
        <Button href={retryHref} className="w-full">
          {copy.retryLabel}
        </Button>
        <Button href={hajiasalPath("/cart")} variant="outline" className="w-full">
          بازگشت به سبد
        </Button>
        <Button href={hajiasalPath("/shop")} variant="ghost" className="w-full">
          بازگشت به فروشگاه
        </Button>
      </div>
    </div>
  );
}

export function PaymentSuccessMeta({
  orderId,
  amount,
  paymentMethod,
}: {
  orderId: string;
  amount?: number | null;
  paymentMethod?: string | null;
}) {
  return (
    <ul className="mt-4 space-y-2 text-sm text-secondary">
      <li className="flex items-center justify-between gap-3">
        <span>شماره سفارش</span>
        <span className="font-mono font-semibold text-primary" dir="ltr">
          {orderId}
        </span>
      </li>
      {amount != null ? (
        <li className="flex items-center justify-between gap-3">
          <span>مبلغ پرداخت‌شده</span>
          <span className="font-semibold text-primary">{formatToman(amount)}</span>
        </li>
      ) : null}
      {paymentMethod ? (
        <li className="flex items-center justify-between gap-3">
          <span>روش پرداخت</span>
          <span className="text-primary">{paymentMethodLabel(paymentMethod)}</span>
        </li>
      ) : null}
      <li className="flex items-center gap-1.5 text-success">
        <CheckCircle size={16} weight="fill" />
        پرداخت تأیید شد
      </li>
    </ul>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Wallet, CreditCard } from "@phosphor-icons/react";
import { SNAPPPAY_FEE_PERCENT } from "@/lib/snappay-constants";
import { cn } from "@/lib/utils";

export type PaymentMethod = "online" | "snappay";

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  description: string;
}

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  cashTotal: number;
  snappayAccepted: boolean;
  onSnappayAcceptedChange: (accepted: boolean) => void;
}

const onlineOption: PaymentOption = {
  id: "online",
  label: "پرداخت آنلاین با درگاه زیبال",
  description: "پرداخت امن با کارت بانکی",
};

const snappayOption: PaymentOption = {
  id: "snappay",
  label: "خرید اقساطی با اسنپ‌پی",
  description: `مبلغ نهایی برابر قیمت نقدی به‌علاوه ${SNAPPPAY_FEE_PERCENT}٪ محاسبه می‌شود`,
};

const icons: Record<PaymentMethod, typeof Wallet> = {
  online: Wallet,
  snappay: CreditCard,
};

export function PaymentMethodSelector({
  value,
  onChange,
  cashTotal,
  snappayAccepted,
  onSnappayAcceptedChange,
}: PaymentMethodSelectorProps) {
  const [available, setAvailable] = useState<{
    zibal: boolean;
    snappay: boolean;
  }>({ zibal: false, snappay: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/checkout/availability")
      .then((r) => r.json())
      .then((d) => {
        setAvailable({
          zibal: Boolean(d.zibal),
          snappay: Boolean(d.snappay),
        });
      })
      .catch(() => setAvailable({ zibal: false, snappay: false }))
      .finally(() => setLoaded(true));
  }, []);

  const options = [
    ...(available.zibal ? [onlineOption] : []),
    ...(available.snappay ? [snappayOption] : []),
  ];

  const snappayTotal = Math.round(cashTotal * (1 + SNAPPPAY_FEE_PERCENT / 100));

  if (!loaded) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated/50 p-4 text-sm text-secondary">
        در حال بارگذاری روش‌های پرداخت...
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
        درگاه پرداخت در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-primary">روش پرداخت</p>
      {!value ? (
        <p className="text-xs text-amber-400/90">
          لطفاً روش پرداخت خود را انتخاب کنید.
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const Icon = icons[option.id];
          const selected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                selected
                  ? "border-gold bg-gold-dim"
                  : "border-border hover:border-border-bright",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  selected
                    ? "bg-gold text-ink-on-gold"
                    : "bg-surface-elevated text-secondary",
                )}
              >
                <Icon size={18} weight="light" />
              </div>
              <div>
                <span className="font-medium text-primary">{option.label}</span>
                <p className="mt-1 text-xs text-secondary">{option.description}</p>
                {option.id === "snappay" && selected ? (
                  <p className="mt-2 text-xs font-medium text-gold tabular-nums">
                    مبلغ قابل پرداخت:{" "}
                    {snappayTotal.toLocaleString("fa-IR")} تومان
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {value === "snappay" ? (
        <div className="rounded-xl border border-border bg-surface-elevated/50 p-4 text-xs leading-relaxed text-secondary">
          <p className="mb-2 font-medium text-primary">قوانین خرید اقساطی</p>
          <ul className="list-disc space-y-1 ps-4">
            <li>
              مبلغ نهایی سفارش با احتساب {SNAPPPAY_FEE_PERCENT}٪ نسبت به قیمت
              نقدی محاسبه می‌شود.
            </li>
            <li>
              پس از پذیرش قوانین به درگاه رسمی اسنپ‌پی هدایت می‌شوید.
            </li>
            <li>
              تعداد اقساط، اعتبار و بازپرداخت مطابق قوانین و API اسنپ‌پی انجام
              می‌شود.
            </li>
            <li>
              در صورت انصراف از درگاه، سفارش در وضعیت در انتظار پرداخت باقی
              می‌ماند.
            </li>
          </ul>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-primary">
            <input
              type="checkbox"
              checked={snappayAccepted}
              onChange={(e) => onSnappayAcceptedChange(e.target.checked)}
              className="mt-1"
            />
            <span>قوانین خرید اقساطی اسنپ‌پی را می‌پذیرم.</span>
          </label>
        </div>
      ) : null}
    </div>
  );
}

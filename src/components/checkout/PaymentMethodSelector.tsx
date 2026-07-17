"use client";

import { useEffect, useState } from "react";
import { Money, CreditCard, Wallet } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cod" | "card_to_card" | "online";

interface PaymentOption {
  id: PaymentMethod;
  label: string;
  description: string;
}

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  onlineDisabled?: boolean;
}

const baseOptions: PaymentOption[] = [
  {
    id: "cod",
    label: "پرداخت در محل",
    description: "پرداخت نقدی یا کارتخوان هنگام تحویل سفارش",
  },
  {
    id: "card_to_card",
    label: "کارت به کارت",
    description: "واریز به حساب و ارسال رسید برای تأیید سفارش",
  },
];

const onlineOption: PaymentOption = {
  id: "online",
  label: "پرداخت آنلاین (زرین‌پال)",
  description: "پرداخت امن با کارت بانکی",
};

const icons: Record<PaymentMethod, typeof Money> = {
  cod: Money,
  card_to_card: CreditCard,
  online: Wallet,
};

export function PaymentMethodSelector({
  value,
  onChange,
  onlineDisabled = false,
}: PaymentMethodSelectorProps) {
  const [showOnline, setShowOnline] = useState(false);

  useEffect(() => {
    void fetch("/api/checkout/availability")
      .then((r) => r.json())
      .then((d) => setShowOnline(Boolean(d.zarinpal)))
      .catch(() => setShowOnline(false));
  }, []);

  const options = showOnline ? [...baseOptions, onlineOption] : baseOptions;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-primary">روش پرداخت</p>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const Icon = icons[option.id];
          const selected = value === option.id;
          const disabled = option.id === "online" && onlineDisabled;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(option.id);
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-start transition-colors",
                disabled && "cursor-not-allowed opacity-45",
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
                <p className="mt-1 text-xs text-secondary">
                  {disabled
                    ? "برای این روش ابتدا وارد حساب شوید"
                    : option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

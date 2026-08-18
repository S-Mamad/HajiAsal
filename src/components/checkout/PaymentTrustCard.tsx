"use client";

import { LockKey, ShieldCheck } from "@phosphor-icons/react";

interface PaymentTrustCardProps {
  gatewayLabel?: string;
  sandbox?: boolean;
}

export function PaymentTrustCard({
  gatewayLabel = "شبکه شتاب / درگاه رسمی",
  sandbox = false,
}: PaymentTrustCardProps) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-sm"
      aria-label="روش پرداخت"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-secondary">
          <ShieldCheck size={16} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-primary">روش پرداخت</p>
          <p className="text-[11.5px] text-secondary">
            پرداخت امن از طریق درگاه رسمی · {gatewayLabel}
          </p>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <LockKey size={14} weight="fill" aria-hidden />
        </span>
      </div>
      {sandbox ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-amber-800 dark:text-amber-300">
          درگاه الان روی حالت تست زیبال است. صفحه بانک ممکن است بگوید هیچ درگاهی
          پاسخگو نیست تا کد مرچنت واقعی بعد از تأیید شاپرک جایگزین شود.
        </p>
      ) : null}
    </div>
  );
}

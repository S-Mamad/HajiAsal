"use client";

import { useEffect, useState } from "react";
import { User, Phone } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPhoneInput } from "@/lib/auth/phone-mask";
import { cn } from "@/lib/utils";

type Props = {
  greeting: string;
  busy?: boolean;
  error?: string | null;
  initialFullName?: string;
  initialPhone?: string;
  allowCancel?: boolean;
  onCancel?: () => void;
  onSubmit: (input: { fullName: string; phone: string }) => Promise<void>;
};

export function SupportGuestIdentityForm({
  greeting,
  busy,
  error,
  initialFullName = "",
  initialPhone = "",
  allowCancel,
  onCancel,
  onSubmit,
}: Props) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(initialFullName);
    setPhone(initialPhone);
  }, [initialFullName, initialPhone]);

  const submit = async () => {
    setLocalError(null);
    const name = fullName.trim();
    if (name.length < 2) {
      setLocalError("نام را وارد کنید");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setLocalError("شماره موبایل معتبر وارد کنید");
      return;
    }
    try {
      await onSubmit({ fullName: name, phone });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "خطا در ثبت مشخصات");
    }
  };

  const shownError = localError || error;

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 space-y-3">
        <p className="text-[15px] font-semibold tracking-tight text-primary">
          شروع گفتگو
        </p>
        <p className="text-[13px] leading-6 text-secondary">{greeting}</p>
        <p className="text-[12px] leading-5 text-dim">
          فقط نام و شماره موبایل کافی است؛ ورود حساب لازم نیست.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-secondary">
            <Icon icon={User} size={14} className="text-gold" aria-hidden />
            نام و نام خانوادگی
          </span>
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            disabled={busy}
            onChange={(e) => setFullName(e.target.value.slice(0, 80))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="مثلاً سارا محمدی"
            className={cn(
              "h-11 w-full rounded-2xl border bg-surface-elevated px-3.5 text-[14px] text-primary",
              "placeholder:text-dim focus:outline-none focus:ring-1",
              "border-border focus:border-gold/50 focus:ring-gold/30",
            )}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-secondary">
            <Icon icon={Phone} size={14} className="text-gold" aria-hidden />
            شماره موبایل
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            disabled={busy}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="09xxxxxxxxx"
            className={cn(
              "h-11 w-full rounded-2xl border bg-surface-elevated px-3.5 text-[14px] tabular-nums tracking-wide text-primary",
              "placeholder:text-dim focus:outline-none focus:ring-1",
              "border-border focus:border-gold/50 focus:ring-gold/30",
            )}
          />
        </label>

        {shownError ? (
          <p
            className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] leading-5 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
            role="alert"
          >
            {shownError}
          </p>
        ) : null}

        <Button
          type="button"
          className="mt-1 h-11 w-full rounded-2xl"
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "در حال ثبت…" : "ادامه گفتگو"}
        </Button>
        {allowCancel && onCancel ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="w-full py-2 text-center text-[12px] text-secondary transition hover:text-primary disabled:opacity-50"
          >
            انصراف
          </button>
        ) : null}
      </div>
    </div>
  );
}

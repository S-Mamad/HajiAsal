"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/EmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountFormSkeleton } from "@/components/account/AccountSkeleton";

export type ProfileInitialUser = {
  fullName: string;
  email: string;
  phone: string;
  newsletterOptIn: boolean;
};

type ProfilePageClientProps = {
  initialUser?: ProfileInitialUser | null;
};

export function ProfilePageClient({ initialUser }: ProfilePageClientProps) {
  const hasInitial = Boolean(initialUser);
  const [fullName, setFullName] = useState(initialUser?.fullName ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [phone, setPhone] = useState(initialUser?.phone ?? "");
  const [newsletter, setNewsletter] = useState(
    Boolean(initialUser?.newsletterOptIn),
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (hasInitial) return;
    let cancelled = false;
    fetch("/api/account/profile")
      .then(async (r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.user) {
          setFullName(data.user.fullName ?? "");
          setEmail(data.user.email ?? "");
          setPhone(data.user.phone ?? "");
          setNewsletter(Boolean(data.user.newsletterOptIn));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hasInitial]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || null,
          newsletterOptIn: newsletter,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "ok", text: "تغییرات ذخیره شد." });
        if (data.user) {
          setFullName(data.user.fullName ?? "");
          setEmail(data.user.email ?? "");
        }
      } else {
        setMessage({
          type: "err",
          text: data.error ?? "ذخیره انجام نشد. دوباره تلاش کنید.",
        });
      }
    } catch {
      setMessage({ type: "err", text: "ارتباط برقرار نشد. دوباره تلاش کنید." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AccountPageHeader title="پروفایل" subtitle="در حال بارگذاری..." />
        <AccountFormSkeleton fields={4} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AccountPageHeader title="پروفایل" />
        <ErrorState
          title="بارگذاری پروفایل ممکن نشد."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="پروفایل"
        subtitle="نام و ایمیل برای فاکتور و پیگیری سفارش استفاده می‌شود. شماره موبایل قابل تغییر نیست."
      />

      <form
        onSubmit={onSave}
        className="account-surface max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام و نام خانوادگی"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثلاً علی رضایی"
            autoComplete="name"
            required
          />
          <Input
            label="موبایل"
            value={phone}
            dir="ltr"
            disabled
            className="opacity-70"
          />
          <p className="-mt-2 text-[11px] text-dim">
            ورود با همین شماره انجام می‌شود؛ برای تغییر با پشتیبانی تماس بگیرید.
          </p>
          <Input
            label="ایمیل (اختیاری)"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-elevated/50 px-3.5 py-3 text-sm text-secondary transition-colors hover:border-gold/25">
            <input
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--gold)]"
            />
            <span>
              <span className="block font-medium text-primary">
                دریافت خبرنامه
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-dim">
                تخفیف‌ها و محصولات تازه عسل را از طریق پیامک یا ایمیل اطلاع
                می‌دهیم.
              </span>
            </span>
          </label>

          <Button
            type="submit"
            disabled={saving || !fullName.trim()}
            className="mt-1 w-full sm:w-auto"
          >
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>

          {message ? (
            <p
              role="status"
              className={
                message.type === "ok"
                  ? "rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              }
            >
              {message.text}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

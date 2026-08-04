"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";

export function ProfilePageClient() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
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
  }, []);

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
        setMessage({ type: "ok", text: "تغییرات با موفقیت ذخیره شد." });
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
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AccountPageHeader title="پروفایل" />
        <div
          className="rounded-2xl border border-red-200/80 bg-red-50/80 px-5 py-8 text-center dark:border-red-900/40 dark:bg-red-950/30"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            بارگذاری پروفایل ممکن نشد.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-red-800 underline underline-offset-2 dark:text-red-200"
          >
            تلاش مجدد
          </button>
        </div>
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
        className="max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-6"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="نام و نام خانوادگی"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="مثلاً علی رضایی"
            autoComplete="name"
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
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-elevated/50 px-3.5 py-3 text-sm text-secondary">
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
                تخفیف‌ها و محصولات تازه عسل را از طریق پیامک یا ایمیل اطلاع می‌دهیم.
              </span>
            </span>
          </label>

          <Button type="submit" disabled={saving} className="mt-1 w-full sm:w-auto">
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>

          {message ? (
            <p
              role="status"
              className={
                message.type === "ok"
                  ? "text-sm text-emerald-700 dark:text-emerald-400"
                  : "text-sm text-red-600 dark:text-red-400"
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

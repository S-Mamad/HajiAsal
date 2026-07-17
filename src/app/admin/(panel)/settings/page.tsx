"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, WarningCircle } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

interface EnvStatus {
  supabase: boolean;
  supabasePing: boolean;
  sessionWriteOk: boolean;
  supabaseError?: string | null;
  sms: boolean;
  zarinpal: boolean;
  authSecret: boolean;
  adminPassword: boolean;
  siteUrl: boolean;
}

const LABELS: Record<keyof Omit<EnvStatus, "supabaseError">, string> = {
  supabase: "Supabase (پیکربندی)",
  supabasePing: "Supabase (اتصال)",
  sessionWriteOk: "نشست ادمین (نوشتن DB)",
  sms: "پیامک (Kavenegar)",
  zarinpal: "زرین‌پال",
  authSecret: "AUTH_SESSION_SECRET",
  adminPassword: "ADMIN_PASSWORD",
  siteUrl: "NEXT_PUBLIC_SITE_URL",
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [productionReady, setProductionReady] = useState(false);
  const [shippingCost, setShippingCost] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);
  const [shippingSaved, setShippingSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setEnv(data.env);
      setMissing(data.missing ?? []);
      setProductionReady(Boolean(data.productionReady));
      if (data.settings) {
        setShippingCost(String(data.settings.shippingCost ?? ""));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveShipping = async () => {
    setSavingShipping(true);
    setError("");
    setShippingSaved(false);
    try {
      const cost = Number(shippingCost);
      if (!Number.isFinite(cost) || cost < 0) {
        throw new Error("هزینه ارسال معتبر نیست");
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCost: cost,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      setShippingSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setSavingShipping(false);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
      router.push(hajiasalPath("/admin"));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">تنظیمات سیستم و وضعیت سرویس‌ها</p>
        <AdminButton type="button" variant="outline" onClick={() => void loadSettings()}>
          بروزرسانی
        </AdminButton>
      </div>

      {productionReady ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon icon={CheckCircle} size={20} />
          آماده production
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Icon icon={WarningCircle} size={20} />
          هنوز برای production آماده نیست. متغیرهای زیر را در Vercel تکمیل کنید
        </div>
      )}

      {missing.length > 0 ? (
        <ul className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {missing.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      {env ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key) => (
            <div
              key={key}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm text-slate-700">
                {LABELS[key]}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm">
                <Icon
                  icon={env[key] ? CheckCircle : XCircle}
                  size={18}
                  className={env[key] ? "text-green-600" : "text-red-500"}
                />
                {env[key] ? "فعال" : "غیرفعال"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {env?.supabaseError ? (
        <p className="text-xs text-red-500" dir="ltr">
          Supabase: {env.supabaseError}
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">ارسال</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-1 text-sm">
            <span>هزینه ارسال عادی (تومان)</span>
            <Input
              dir="ltr"
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="w-full"
            />
          </label>
          <AdminButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void saveShipping()}
            disabled={savingShipping}
          >
            {savingShipping ? "در حال ذخیره..." : "ذخیره ارسال"}
          </AdminButton>
        </div>
        {shippingSaved ? (
          <p className="mt-3 text-sm text-emerald-700">هزینه ارسال ذخیره شد.</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-2 font-semibold text-slate-900">خروج از پنل</h3>
        <p className="mb-4 text-sm text-slate-500">
          با خروج، نشست ادمین از سرور حذف می‌شود.
        </p>
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          {loggingOut ? "در حال خروج..." : "خروج از پنل مدیریت"}
        </AdminButton>
      </div>
    </div>
  );
}

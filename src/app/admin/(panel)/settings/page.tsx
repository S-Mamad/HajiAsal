"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, WarningCircle } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

interface EnvStatus {
  mysql: boolean;
  mysqlPing: boolean;
  mysqlError?: string | null;
  sms: boolean;
  transactionalSms: boolean;
  orderSms: boolean;
  zibal: boolean;
  zibalRefund: boolean;
  authSecret: boolean;
  adminOtp: boolean;
  siteUrl: boolean;
  adminUrl: boolean;
  sellerUrl: boolean;
}

const LABELS: Record<keyof Omit<EnvStatus, "mysqlError">, string> = {
  mysql: "MySQL (پیکربندی)",
  mysqlPing: "MySQL (اتصال)",
  sms: "پیامک (OTP ورود)",
  transactionalSms: "پیامک آزاد (ارسال دستی ادمین)",
  orderSms: "پیامک خودکار سفارش",
  zibal: "زیبال",
  zibalRefund: "استرداد زیبال (بانکداری شرکتی)",
  authSecret: "AUTH_SESSION_SECRET",
  adminOtp: "ورود ادمین با OTP",
  siteUrl: "NEXT_PUBLIC_SITE_URL",
  adminUrl: "NEXT_PUBLIC_ADMIN_URL",
  sellerUrl: "NEXT_PUBLIC_SELLER_URL",
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [productionReady, setProductionReady] = useState(false);
  const [shippingCost, setShippingCost] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [telegram, setTelegram] = useState<{
    enabled: boolean;
    tokenConfigured: boolean;
    chatCount: number;
    usingCloudflareProxy: boolean;
    note?: string;
  } | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramPinging, setTelegramPinging] = useState(false);

  const loadTelegram = useCallback(async () => {
    setTelegramLoading(true);
    try {
      const res = await fetch("/api/admin/telegram");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      if (res.status === 403) {
        setTelegram(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در وضعیت تلگرام");
      setTelegram({
        enabled: Boolean(data.enabled),
        tokenConfigured: Boolean(data.tokenConfigured),
        chatCount: Number(data.chatCount ?? 0),
        usingCloudflareProxy: Boolean(data.usingCloudflareProxy),
        note: typeof data.note === "string" ? data.note : undefined,
      });
    } catch {
      setTelegram(null);
    } finally {
      setTelegramLoading(false);
    }
  }, [router]);

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
      const rawEnv = data.env ?? {};
      setEnv({
        mysql: Boolean(rawEnv.mysql ?? rawEnv.supabase),
        mysqlPing: Boolean(rawEnv.mysqlPing ?? rawEnv.supabasePing),
        mysqlError: rawEnv.mysqlError ?? rawEnv.supabaseError ?? null,
        sms: Boolean(rawEnv.sms),
        transactionalSms: Boolean(rawEnv.transactionalSms),
        orderSms: Boolean(rawEnv.orderSms),
        zibal: Boolean(rawEnv.zibal),
        zibalRefund: Boolean(rawEnv.zibalRefund),
        authSecret: Boolean(rawEnv.authSecret),
        adminOtp: Boolean(rawEnv.adminOtp ?? true),
        siteUrl: Boolean(rawEnv.siteUrl),
        adminUrl: Boolean(rawEnv.adminUrl),
        sellerUrl: Boolean(rawEnv.sellerUrl),
      });
      setMissing(data.missing ?? []);
      setProductionReady(Boolean(data.productionReady));
      if (data.settings) {
        setShippingCost(String(data.settings.shippingCost ?? ""));
      }
      void loadTelegram();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router, loadTelegram]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveShipping = async () => {
    setSavingShipping(true);
    setError("");
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
      toast.success("هزینه ارسال ذخیره شد");
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته";
      setError(message);
      toast.error(message);
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

  const pingTelegram = async () => {
    setTelegramPinging(true);
    try {
      const res = await fetch("/api/admin/telegram", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ارسال تست ناموفق بود");
      toast.success(data.message ?? "پیام تست ارسال شد");
      void loadTelegram();
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته";
      toast.error(message);
    } finally {
      setTelegramPinging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">تنظیمات سیستم و وضعیت سرویس‌ها</p>
        <AdminButton type="button" variant="outline" onClick={() => void loadSettings()}>
          بروزرسانی
        </AdminButton>
      </div>

      {productionReady ? (
        <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon icon={CheckCircle} size={20} />
          آماده production
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Icon icon={WarningCircle} size={20} />
          هنوز برای production آماده نیست. متغیرهای زیر را تکمیل کنید
        </div>
      )}

      {missing.length > 0 ? (
        <ul className="rounded-[var(--panel-radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {missing.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading && !env ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-[var(--panel-radius)] border border-zinc-200 bg-zinc-100"
            />
          ))}
        </div>
      ) : null}

      {env ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key) => (
            <div
              key={key}
              className="panel-card flex min-w-0 items-center justify-between gap-3 px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm text-zinc-700">
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

      {env?.mysqlError ? (
        <p className="text-xs text-red-500" dir="ltr">
          MySQL: {env.mysqlError}
        </p>
      ) : null}

      <div className="panel-card p-5">
        <h3 className="mb-3 font-semibold text-zinc-900">ارسال</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="space-y-1 text-sm">
            <span>هزینه ارسال عادی (تومان)</span>
            <AdminInput
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
      </div>

      <div className="panel-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-zinc-900">تلگرام ادمین</h3>
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadTelegram()}
            disabled={telegramLoading}
          >
            {telegramLoading ? "…" : "بروزرسانی وضعیت"}
          </AdminButton>
        </div>
        {telegram ? (
          <div className="space-y-3 text-sm text-zinc-600">
            <ul className="space-y-1">
              <li>
                وضعیت:{" "}
                <span className={telegram.enabled ? "text-emerald-700" : "text-amber-700"}>
                  {telegram.enabled ? "فعال" : "غیرفعال / ناقص"}
                </span>
              </li>
              <li>توکن: {telegram.tokenConfigured ? "تنظیم شده" : "نیست"}</li>
              <li>تعداد چت ادمین: {telegram.chatCount.toLocaleString("fa-IR")}</li>
              <li>
                پروکسی Cloudflare:{" "}
                {telegram.usingCloudflareProxy ? "بله" : "خیر (مستقیم api.telegram.org)"}
              </li>
            </ul>
            {telegram.note ? (
              <p className="text-xs text-zinc-500">{telegram.note}</p>
            ) : null}
            <AdminButton
              type="button"
              onClick={() => void pingTelegram()}
              disabled={telegramPinging || !telegram.enabled}
            >
              {telegramPinging ? "در حال ارسال..." : "ارسال پیام تست"}
            </AdminButton>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            وضعیت تلگرام در دسترس نیست (دسترسی یا پیکربندی).
          </p>
        )}
      </div>

      <div className="panel-card p-5">
        <h3 className="mb-2 font-semibold text-zinc-900">خروج از پنل</h3>
        <p className="mb-4 text-sm text-zinc-500">
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

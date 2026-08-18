"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, WarningCircle } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminAccordion } from "@/components/admin/ui/AdminAccordion";
import { AdminInput, AdminTextarea } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { CartPromoProductPicker } from "@/components/admin/CartPromoProductPicker";
import { DEFAULT_CART_PROMO } from "@/lib/cart-promo";
import {
  DEFAULT_SEARCH_UI,
  parseSearchSuggestionLines,
} from "@/lib/search-ui";

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
  const [freeShippingThreshold, setFreeShippingThreshold] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [expressShippingCost, setExpressShippingCost] = useState("");
  const [pickupShippingCost, setPickupShippingCost] = useState("");
  const [freeShippingIncludesExpress, setFreeShippingIncludesExpress] =
    useState(true);
  const [freeShippingBarEnabled, setFreeShippingBarEnabled] = useState(true);
  const [freeShippingRemainingText, setFreeShippingRemainingText] =
    useState(DEFAULT_CART_PROMO.freeShippingRemainingText);
  const [freeShippingUnlockedText, setFreeShippingUnlockedText] = useState(
    DEFAULT_CART_PROMO.freeShippingUnlockedText,
  );
  const [impulseEnabled, setImpulseEnabled] = useState(true);
  const [impulseTitle, setImpulseTitle] = useState(
    DEFAULT_CART_PROMO.impulseTitle,
  );
  const [impulseMode, setImpulseMode] = useState<"popular" | "manual">(
    "popular",
  );
  const [impulseProductIds, setImpulseProductIds] = useState<string[]>([]);
  const [impulseLimit, setImpulseLimit] = useState("8");
  const [savingCartPromo, setSavingCartPromo] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    DEFAULT_SEARCH_UI.placeholder,
  );
  const [searchSuggestionsTitle, setSearchSuggestionsTitle] = useState(
    DEFAULT_SEARCH_UI.suggestionsTitle,
  );
  const [searchHint, setSearchHint] = useState(DEFAULT_SEARCH_UI.hint);
  const [searchSuggestionsText, setSearchSuggestionsText] = useState(
    DEFAULT_SEARCH_UI.suggestions.join("\n"),
  );
  const [savingSearchUi, setSavingSearchUi] = useState(false);
  const [standardLabel, setStandardLabel] = useState("");
  const [standardEta, setStandardEta] = useState("");
  const [standardDescription, setStandardDescription] = useState("");
  const [expressLabel, setExpressLabel] = useState("");
  const [expressEta, setExpressEta] = useState("");
  const [expressDescription, setExpressDescription] = useState("");
  const [pickupLabel, setPickupLabel] = useState("");
  const [pickupEta, setPickupEta] = useState("");
  const [pickupDescription, setPickupDescription] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [telegram, setTelegram] = useState<{
    enabled: boolean;
    tokenConfigured: boolean;
    chatCount: number;
    usingCloudflareProxy: boolean;
    cronSecretConfigured?: boolean;
    outboxPending?: number;
    dlqCount?: number;
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
        cronSecretConfigured: Boolean(data.cronSecretConfigured),
        outboxPending: Number(data.outboxPending ?? 0),
        dlqCount: Number(data.dlqCount ?? 0),
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
        setExpressShippingCost(String(data.settings.expressShippingCost ?? ""));
        setPickupShippingCost(String(data.settings.pickupShippingCost ?? "0"));
        setFreeShippingThreshold(
          String(data.settings.freeShippingThreshold ?? ""),
        );
        setFreeShippingIncludesExpress(
          data.settings.freeShippingIncludesExpress !== false,
        );
        const promo = data.settings.cartPromo ?? {};
        setFreeShippingBarEnabled(promo.freeShippingBarEnabled !== false);
        setFreeShippingRemainingText(
          String(
            promo.freeShippingRemainingText ||
              DEFAULT_CART_PROMO.freeShippingRemainingText,
          ),
        );
        setFreeShippingUnlockedText(
          String(
            promo.freeShippingUnlockedText ||
              DEFAULT_CART_PROMO.freeShippingUnlockedText,
          ),
        );
        setImpulseEnabled(promo.impulseEnabled !== false);
        setImpulseTitle(
          String(promo.impulseTitle || DEFAULT_CART_PROMO.impulseTitle),
        );
        setImpulseMode(promo.impulseMode === "manual" ? "manual" : "popular");
        setImpulseProductIds(
          Array.isArray(promo.impulseProductIds)
            ? promo.impulseProductIds.filter(
                (id: unknown): id is string =>
                  typeof id === "string" && id.trim().length > 0,
              )
            : [],
        );
        setImpulseLimit(String(promo.impulseLimit ?? 8));
        const searchUi = data.settings.searchUi ?? {};
        setSearchPlaceholder(
          String(searchUi.placeholder ?? DEFAULT_SEARCH_UI.placeholder),
        );
        setSearchSuggestionsTitle(
          String(
            searchUi.suggestionsTitle ?? DEFAULT_SEARCH_UI.suggestionsTitle,
          ),
        );
        setSearchHint(
          typeof searchUi.hint === "string"
            ? searchUi.hint
            : DEFAULT_SEARCH_UI.hint,
        );
        setSearchSuggestionsText(
          Array.isArray(searchUi.suggestions)
            ? searchUi.suggestions.join("\n")
            : DEFAULT_SEARCH_UI.suggestions.join("\n"),
        );
        const methods = data.settings.shippingMethods ?? {};
        setStandardLabel(String(methods.standard?.label ?? ""));
        setStandardEta(String(methods.standard?.eta ?? ""));
        setStandardDescription(String(methods.standard?.description ?? ""));
        setExpressLabel(String(methods.express?.label ?? ""));
        setExpressEta(String(methods.express?.eta ?? ""));
        setExpressDescription(String(methods.express?.description ?? ""));
        setPickupLabel(String(methods.pickup?.label ?? ""));
        setPickupEta(String(methods.pickup?.eta ?? ""));
        setPickupDescription(String(methods.pickup?.description ?? ""));
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
      const parseCost = (raw: string, label: string) => {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          throw new Error(`${label} معتبر نیست`);
        }
        return n;
      };
      const cost = parseCost(shippingCost, "هزینه پست پیشتاز");
      const expressCost = parseCost(
        expressShippingCost,
        "هزینه پست ویژه",
      );
      const pickupCost = parseCost(
        pickupShippingCost || "0",
        "هزینه تحویل حضوری",
      );
      const threshold = parseCost(
        freeShippingThreshold || "0",
        "آستانه ارسال رایگان",
      );
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingCost: cost,
          expressShippingCost: expressCost,
          pickupShippingCost: pickupCost,
          freeShippingThreshold: threshold,
          freeShippingIncludesExpress,
          shippingMethods: {
            standard: {
              label: standardLabel.trim(),
              description: standardDescription.trim(),
              eta: standardEta.trim(),
            },
            express: {
              label: expressLabel.trim(),
              description: expressDescription.trim(),
              eta: expressEta.trim(),
            },
            pickup: {
              label: pickupLabel.trim(),
              description: pickupDescription.trim(),
              eta: pickupEta.trim(),
            },
          },
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

  const saveCartPromo = async () => {
    setSavingCartPromo(true);
    setError("");
    try {
      const threshold = Number(freeShippingThreshold || "0");
      if (!Number.isFinite(threshold) || threshold < 0) {
        throw new Error("آستانه ارسال رایگان معتبر نیست");
      }
      const limit = Number(impulseLimit || "8");
      if (!Number.isFinite(limit) || limit < 1 || limit > 16) {
        throw new Error("تعداد پیشنهاد باید بین ۱ تا ۱۶ باشد");
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeShippingThreshold: threshold,
          cartPromo: {
            freeShippingBarEnabled,
            freeShippingRemainingText: freeShippingRemainingText.trim(),
            freeShippingUnlockedText: freeShippingUnlockedText.trim(),
            impulseEnabled,
            impulseTitle: impulseTitle.trim(),
            impulseMode,
            impulseProductIds:
              impulseMode === "manual" ? impulseProductIds : [],
            impulseLimit: Math.round(limit),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      toast.success("تنظیمات سبد ذخیره شد");
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته";
      setError(message);
      toast.error(message);
    } finally {
      setSavingCartPromo(false);
    }
  };

  const saveSearchUi = async () => {
    setSavingSearchUi(true);
    setError("");
    try {
      const suggestions = parseSearchSuggestionLines(searchSuggestionsText);
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchUi: {
            placeholder: searchPlaceholder.trim().slice(0, 80),
            suggestionsTitle: searchSuggestionsTitle.trim().slice(0, 40),
            hint: searchHint.trim().slice(0, 160),
            suggestions,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      toast.success("تنظیمات جستجو ذخیره شد");
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطای ناشناخته";
      setError(message);
      toast.error(message);
    } finally {
      setSavingSearchUi(false);
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

      <AdminAccordion
        title="ارسال"
        description="مبلغ، عنوان، زمان رسیدن و توضیح هر روش. همین مقادیر در چک‌اوت و محاسبه سفارش استفاده می‌شود."
        defaultOpen
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>آستانه ارسال رایگان (تومان، ۰=خاموش)</span>
              <AdminInput
                dir="ltr"
                type="number"
                min={0}
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="w-full"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={freeShippingIncludesExpress}
                onChange={(e) =>
                  setFreeShippingIncludesExpress(e.target.checked)
                }
              />
              <span>ارسال رایگان شامل پست ویژه هم بشود</span>
            </label>
          </div>

          {(
            [
              {
                title: "پست پیشتاز",
                cost: shippingCost,
                setCost: setShippingCost,
                costLabel: "هزینه (تومان)",
                label: standardLabel,
                setLabel: setStandardLabel,
                eta: standardEta,
                setEta: setStandardEta,
                description: standardDescription,
                setDescription: setStandardDescription,
              },
              {
                title: "پست ویژه",
                cost: expressShippingCost,
                setCost: setExpressShippingCost,
                costLabel: "هزینه (تومان)",
                label: expressLabel,
                setLabel: setExpressLabel,
                eta: expressEta,
                setEta: setExpressEta,
                description: expressDescription,
                setDescription: setExpressDescription,
              },
              {
                title: "تحویل حضوری",
                cost: pickupShippingCost,
                setCost: setPickupShippingCost,
                costLabel: "هزینه (تومان، معمولاً ۰)",
                label: pickupLabel,
                setLabel: setPickupLabel,
                eta: pickupEta,
                setEta: setPickupEta,
                description: pickupDescription,
                setDescription: setPickupDescription,
              },
            ] as const
          ).map((method) => (
            <div
              key={method.title}
              className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 p-4 sm:grid-cols-2"
            >
              <p className="sm:col-span-2 text-sm font-medium text-zinc-800">
                {method.title}
              </p>
              <label className="space-y-1 text-sm">
                <span>{method.costLabel}</span>
                <AdminInput
                  dir="ltr"
                  type="number"
                  min={0}
                  value={method.cost}
                  onChange={(e) => method.setCost(e.target.value)}
                  className="w-full"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>عنوان نمایشی</span>
                <AdminInput
                  value={method.label}
                  onChange={(e) => method.setLabel(e.target.value)}
                  className="w-full"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>زمان رسیدن</span>
                <AdminInput
                  value={method.eta}
                  onChange={(e) => method.setEta(e.target.value)}
                  className="w-full"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>توضیح کوتاه</span>
                <AdminInput
                  value={method.description}
                  onChange={(e) => method.setDescription(e.target.value)}
                  className="w-full"
                />
              </label>
            </div>
          ))}

          <AdminButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void saveShipping()}
            disabled={savingShipping}
          >
            {savingShipping ? "در حال ذخیره..." : "ذخیره ارسال"}
          </AdminButton>
        </div>
      </AdminAccordion>

      <AdminAccordion
        title="سبد خرید"
        description="نوار ارسال رایگان و پیشنهاد لحظه آخر را از اینجا روشن یا خاموش کنید، متن‌ها را عوض کنید، یا محصولات پیشنهادی را خودتان بچینید."
      >
        <div className="space-y-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={freeShippingBarEnabled}
              onChange={(e) => setFreeShippingBarEnabled(e.target.checked)}
            />
            <span>نمایش نوار ارسال رایگان در سبد</span>
          </label>
          <label className="space-y-1 text-sm">
            <span>آستانه ارسال رایگان (تومان، ۰=خاموش)</span>
            <AdminInput
              dir="ltr"
              type="number"
              min={0}
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(e.target.value)}
              className="w-full"
            />
            <span className="block text-xs text-zinc-500">
              اگر صفر باشد هم ارسال رایگان و هم نوار غیرفعال می‌شود.
            </span>
          </label>
          <label className="space-y-1 text-sm">
            <span>متن قبل از رسیدن به آستانه</span>
            <AdminInput
              value={freeShippingRemainingText}
              onChange={(e) => setFreeShippingRemainingText(e.target.value)}
              className="w-full"
            />
            <span className="block text-xs text-zinc-500">
              از {"{amount}"} برای مبلغ باقی‌مانده استفاده کنید.
            </span>
          </label>
          <label className="space-y-1 text-sm">
            <span>متن بعد از فعال شدن ارسال رایگان</span>
            <AdminInput
              value={freeShippingUnlockedText}
              onChange={(e) => setFreeShippingUnlockedText(e.target.value)}
              className="w-full"
            />
          </label>

          <div className="border-t border-zinc-200 pt-5">
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={impulseEnabled}
                onChange={(e) => setImpulseEnabled(e.target.checked)}
              />
              <span>نمایش پیشنهاد لحظه آخر در سبد</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>عنوان بخش</span>
                <AdminInput
                  value={impulseTitle}
                  onChange={(e) => setImpulseTitle(e.target.value)}
                  className="w-full"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>حداکثر تعداد کارت</span>
                <AdminInput
                  dir="ltr"
                  type="number"
                  min={1}
                  max={16}
                  value={impulseLimit}
                  onChange={(e) => setImpulseLimit(e.target.value)}
                  className="w-full"
                />
              </label>
            </div>
            <fieldset className="mt-3 space-y-2 text-sm">
              <legend className="mb-1 text-zinc-700">منبع محصولات</legend>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="impulse-mode"
                  checked={impulseMode === "popular"}
                  onChange={() => setImpulseMode("popular")}
                />
                <span>خودکار از پرفروش‌های موجود</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="impulse-mode"
                  checked={impulseMode === "manual"}
                  onChange={() => setImpulseMode("manual")}
                />
                <span>انتخاب دستی محصولات</span>
              </label>
            </fieldset>
            {impulseMode === "manual" ? (
              <div className="mt-3">
                <CartPromoProductPicker
                  ids={impulseProductIds}
                  onChange={setImpulseProductIds}
                />
              </div>
            ) : null}
          </div>

          <AdminButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void saveCartPromo()}
            disabled={savingCartPromo}
          >
            {savingCartPromo ? "در حال ذخیره..." : "ذخیره سبد خرید"}
          </AdminButton>
        </div>
      </AdminAccordion>

      <AdminAccordion
        title="جستجوی فروشگاه"
        description="متن داخل کادر جستجو و چیپ‌های پیشنهادی را از اینجا عوض کنید."
      >
        <div className="space-y-4">
          <label className="space-y-1 text-sm">
            <span>متن راهنمای داخل کادر</span>
            <AdminInput
              value={searchPlaceholder}
              onChange={(e) => setSearchPlaceholder(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>عنوان پیشنهادها</span>
            <AdminInput
              value={searchSuggestionsTitle}
              onChange={(e) => setSearchSuggestionsTitle(e.target.value)}
              className="w-full"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>پیشنهادها (هر خط یک مورد)</span>
            <AdminTextarea
              rows={6}
              value={searchSuggestionsText}
              onChange={(e) => setSearchSuggestionsText(e.target.value)}
              className="w-full"
            />
            <span className="block text-xs text-zinc-500">
              حداکثر ۱۶ مورد. با خالی گذاشتن، بخش پیشنهادها مخفی می‌شود.
            </span>
          </label>
          <label className="space-y-1 text-sm">
            <span>توضیح زیر پیشنهادها</span>
            <AdminInput
              value={searchHint}
              onChange={(e) => setSearchHint(e.target.value)}
              className="w-full"
            />
          </label>
          <AdminButton
            type="button"
            className="w-full sm:w-auto"
            onClick={() => void saveSearchUi()}
            disabled={savingSearchUi}
          >
            {savingSearchUi ? "در حال ذخیره..." : "ذخیره جستجو"}
          </AdminButton>
        </div>
      </AdminAccordion>

      <AdminAccordion title="تلگرام ادمین" description="وضعیت ربات، صف پیام و پیام تست">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
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
              <li>
                کرون صف:{" "}
                {telegram.cronSecretConfigured ? "آماده (CRON_SECRET)" : "ناقص — CRON_SECRET نیست"}
              </li>
              <li>
                صف در انتظار: {(telegram.outboxPending ?? 0).toLocaleString("fa-IR")}
              </li>
              <li>
                ناموفق ماندگار (DLQ): {(telegram.dlqCount ?? 0).toLocaleString("fa-IR")}
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
      </AdminAccordion>

      <AdminAccordion title="خروج از پنل" description="با خروج، نشست ادمین از سرور حذف می‌شود.">
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          {loggingOut ? "در حال خروج..." : "خروج از پنل مدیریت"}
        </AdminButton>
      </AdminAccordion>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { UserAddress } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { AccountSkeleton } from "@/components/account/AccountSkeleton";
import { AccountSurface } from "@/components/account/AccountSurface";
import iranLocations from "@/data/iran-locations.json";

type LocationEntry = { province: string; cities: string[] };

const selectClass =
  "h-11 w-full rounded-xl border border-border bg-surface-elevated px-4 text-sm text-primary transition-colors focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-55";

type AddressesPageClientProps = {
  initialAddresses?: UserAddress[];
};

export function AddressesPageClient({
  initialAddresses,
}: AddressesPageClientProps) {
  const hasInitial = initialAddresses !== undefined;
  const [addresses, setAddresses] = useState<UserAddress[]>(
    initialAddresses ?? [],
  );
  const [loading, setLoading] = useState(!hasInitial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [label, setLabel] = useState("");

  const cities =
    (iranLocations as LocationEntry[]).find((l) => l.province === province)
      ?.cities ?? [];

  const load = async () => {
    try {
      const r = await fetch("/api/account/addresses");
      if (!r.ok) throw new Error("failed");
      const d = await r.json();
      setAddresses(d.addresses ?? []);
    } catch {
      setError("بارگذاری آدرس‌ها ممکن نشد.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitial) return;
    void load();
  }, [hasInitial]);

  const resetForm = () => {
    setProvince("");
    setCity("");
    setAddress("");
    setPostalCode("");
    setLabel("");
    setError("");
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!province || !city || address.trim().length < 5 || !postalCode.trim()) {
      setError("استان، شهر، آدرس کامل و کد پستی الزامی است.");
      return;
    }
    if (!/^\d{10}$/.test(postalCode.trim())) {
      setError("کد پستی باید ۱۰ رقم باشد.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || undefined,
          province,
          city,
          address: address.trim(),
          postalCode: postalCode.trim(),
          isDefault: addresses.length === 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? data.message ?? "ذخیره آدرس انجام نشد.");
        return;
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch {
      setError("ارتباط برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("حذف آدرس انجام نشد.");
        return;
      }
      await load();
    } catch {
      setError("حذف آدرس ممکن نشد.");
    } finally {
      setDeletingId(null);
    }
  };

  const onSetDefault = async (id: string) => {
    setDefaultingId(id);
    setError("");
    try {
      const res = await fetch("/api/account/addresses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "setDefault" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "تنظیم آدرس پیش‌فرض انجام نشد.");
        return;
      }
      if (Array.isArray(data.addresses)) {
        setAddresses(data.addresses);
      } else {
        await load();
      }
    } catch {
      setError("تنظیم آدرس پیش‌فرض ممکن نشد.");
    } finally {
      setDefaultingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <AccountPageHeader title="آدرس‌های من" subtitle="در حال بارگذاری..." />
        <AccountSkeleton rows={2} rowClassName="h-28" />
      </div>
    );
  }

  return (
    <div>
      <AccountPageHeader
        title="آدرس‌های من"
        subtitle="آدرس ارسال را ذخیره کنید تا در خرید بعدی خودکار پر شود."
        action={
          <Button
            type="button"
            size="sm"
            variant={showForm ? "outline" : "primary"}
            className="w-full sm:w-auto"
            onClick={() => {
              setShowForm((v) => !v);
              setError("");
            }}
          >
            {showForm ? "انصراف" : "آدرس جدید"}
          </Button>
        }
      />

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={onAdd}
          className="account-surface mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
        >
          <Input
            label="برچسب (اختیاری)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="خانه، محل کار"
          />
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-secondary"
              htmlFor="addr-province"
            >
              استان
            </label>
            <select
              id="addr-province"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setCity("");
              }}
              className={selectClass}
              required
            >
              <option value="">انتخاب استان</option>
              {(iranLocations as LocationEntry[]).map((l) => (
                <option key={l.province} value={l.province}>
                  {l.province}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-secondary"
              htmlFor="addr-city"
            >
              شهر
            </label>
            <select
              id="addr-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={selectClass}
              required
              disabled={!province}
            >
              <option value="">انتخاب شهر</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="آدرس کامل"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="خیابان، کوچه، پلاک، واحد"
            required
          />
          <Input
            label="کد پستی"
            dir="ltr"
            inputMode="numeric"
            maxLength={10}
            value={postalCode}
            onChange={(e) =>
              setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            placeholder="۱۰ رقم"
            required
          />
          <Button type="submit" disabled={saving} className="mt-1">
            {saving ? "در حال ذخیره..." : "ذخیره آدرس"}
          </Button>
        </form>
      ) : null}

      <ul className="flex flex-col gap-3">
        {addresses.length === 0 && !showForm ? (
          <EmptyState
            title="آدرسی ذخیره نشده"
            description="اولین آدرس ارسال را اضافه کنید تا تسویه حساب سریع‌تر شود."
            action={
              <Button type="button" size="sm" onClick={() => setShowForm(true)}>
                افزودن آدرس
              </Button>
            }
          />
        ) : null}
        {addresses.map((a) => (
          <AccountSurface as="li" key={a.id} className="list-none sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {a.label ? (
                    <p className="text-xs font-semibold text-gold">{a.label}</p>
                  ) : (
                    <p className="text-xs font-medium text-secondary">آدرس</p>
                  )}
                  {a.isDefault ? (
                    <span className="rounded-md bg-gold-dim px-2 py-0.5 text-[10px] font-medium text-gold">
                      پیش‌فرض
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm font-medium text-primary">
                  {a.province}، {a.city}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">
                  {a.address}
                </p>
                <p
                  className="mt-1.5 font-mono text-xs tabular-nums text-dim"
                  dir="ltr"
                >
                  {a.postalCode}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {!a.isDefault ? (
                  <button
                    type="button"
                    onClick={() => void onSetDefault(a.id)}
                    disabled={defaultingId === a.id || deletingId === a.id}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold-dim disabled:opacity-50"
                  >
                    {defaultingId === a.id
                      ? "در حال تنظیم..."
                      : "پیش‌فرض کردن"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void onDelete(a.id)}
                  disabled={deletingId === a.id || defaultingId === a.id}
                  className="rounded-lg px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {deletingId === a.id ? "در حال حذف..." : "حذف"}
                </button>
              </div>
            </div>
          </AccountSurface>
        ))}
      </ul>
    </div>
  );
}

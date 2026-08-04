"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

export default function SellerSettingsPage() {
  const router = useRouter();
  const [workingHours, setWorkingHours] = useState("۹ تا ۱۸");
  const [prepTimeHours, setPrepTimeHours] = useState("24");
  const [autoMessage, setAutoMessage] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/settings");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      if (res.status === 403) {
        setError("دسترسی به تنظیمات ندارید");
        return;
      }
      if (res.status === 503) {
        setError("سرویس تنظیمات موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطا در بارگذاری تنظیمات");
        return;
      }
      const s = data.shopSettings ?? {};
      if (s.workingHours) setWorkingHours(s.workingHours);
      if (s.prepTimeHours != null) setPrepTimeHours(String(s.prepTimeHours));
      if (s.autoMessage) setAutoMessage(s.autoMessage);
      if (s.shippingNotes) setShippingNotes(s.shippingNotes);
      if (s.lowStockThreshold != null)
        setLowStockThreshold(String(s.lowStockThreshold));
    } catch {
      setError("خطا در بارگذاری تنظیمات");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/seller/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopSettings: {
            workingHours,
            prepTimeHours: Number(prepTimeHours) || 24,
            autoMessage,
            shippingNotes,
            lowStockThreshold: Number(lowStockThreshold) || 10,
          },
        }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setError("دسترسی به ویرایش تنظیمات ندارید");
        return;
      }
      if (res.status === 503) {
        setError("ذخیره تنظیمات موقتاً ممکن نیست. کمی بعد دوباره تلاش کنید.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "خطا");
        return;
      }
      setMessage("تنظیمات ذخیره شد");
    } catch {
      setError("خطا در ذخیره تنظیمات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-stone-500">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <Input label="ساعت کاری" value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} />
        <Input label="زمان آماده‌سازی (ساعت)" value={prepTimeHours} onChange={(e) => setPrepTimeHours(e.target.value)} type="number" />
        <Input label="آستانه موجودی کم" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} type="number" />
        <Input label="پیام خودکار" value={autoMessage} onChange={(e) => setAutoMessage(e.target.value)} />
        <Input label="تنظیمات ارسال" value={shippingNotes} onChange={(e) => setShippingNotes(e.target.value)} />
      </div>
      <AdminButton onClick={() => void save()} disabled={saving}>
        {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
      </AdminButton>
    </div>
  );
}

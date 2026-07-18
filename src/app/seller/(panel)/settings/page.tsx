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

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/profile");
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    const data = await res.json();
    const s = data.seller?.shopSettings ?? {};
    if (s.workingHours) setWorkingHours(s.workingHours);
    if (s.prepTimeHours != null) setPrepTimeHours(String(s.prepTimeHours));
    if (s.autoMessage) setAutoMessage(s.autoMessage);
    if (s.shippingNotes) setShippingNotes(s.shippingNotes);
    if (s.lowStockThreshold != null)
      setLowStockThreshold(String(s.lowStockThreshold));
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setError("");
    setMessage("");
    const res = await fetch("/api/seller/profile", {
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
    if (!res.ok) {
      setError(data.error ?? "خطا");
      return;
    }
    setMessage("تنظیمات ذخیره شد");
  };

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
      <AdminButton onClick={() => void save()}>ذخیره تنظیمات</AdminButton>
    </div>
  );
}

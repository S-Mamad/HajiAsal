"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

type SellerProfile = {
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  address?: string;
  contactPhone?: string;
  logo?: string;
  banner?: string;
  bankName?: string;
  bankSheba?: string;
  bankCard?: string;
  commissionPercent: number;
  status: string;
};

export default function SellerProfilePage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/profile");
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    const data = await res.json();
    setSeller(data.seller);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!seller) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: seller.shopName,
          ownerName: seller.ownerName,
          city: seller.city,
          address: seller.address ?? null,
          contactPhone: seller.contactPhone ?? null,
          logo: seller.logo ?? null,
          banner: seller.banner ?? null,
          bankName: seller.bankName ?? null,
          bankSheba: seller.bankSheba ?? null,
          bankCard: seller.bankCard ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setSeller(data.seller);
      setMessage("پروفایل ذخیره شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  if (!seller) return <p className="text-sm text-stone-500">در حال بارگذاری...</p>;

  const set = (key: keyof SellerProfile, value: string) =>
    setSeller({ ...seller, [key]: value });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <Input label="نام فروشگاه" value={seller.shopName} onChange={(e) => set("shopName", e.target.value)} />
        <Input label="نام صاحب" value={seller.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
        <Input label="شهر" value={seller.city} onChange={(e) => set("city", e.target.value)} />
        <Input label="تلفن تماس فروشگاه" value={seller.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
        <Input label="آدرس" value={seller.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        <Input label="لوگو (URL)" value={seller.logo ?? ""} onChange={(e) => set("logo", e.target.value)} />
        <Input label="بنر (URL)" value={seller.banner ?? ""} onChange={(e) => set("banner", e.target.value)} />
        <Input label="بانک" value={seller.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} />
        <Input label="شبا" value={seller.bankSheba ?? ""} onChange={(e) => set("bankSheba", e.target.value)} />
        <Input label="کارت" value={seller.bankCard ?? ""} onChange={(e) => set("bankCard", e.target.value)} />
        <div className="sm:col-span-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
          موبایل ورود: {seller.phone} (قفل) · کمیسیون: {seller.commissionPercent}% · وضعیت: {seller.status}
        </div>
      </div>
      <AdminButton onClick={() => void save()} disabled={saving}>
        ذخیره پروفایل
      </AdminButton>
    </div>
  );
}

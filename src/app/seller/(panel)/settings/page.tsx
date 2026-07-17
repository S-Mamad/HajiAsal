"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

interface SellerProfile {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  status: string;
  joinedAt: string;
}

export default function SellerSettingsPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/seller/auth");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      setSeller(data.seller ?? null);
    } catch {
      setError("خطا در بارگذاری پروفایل");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    await fetch("/api/seller/auth", { method: "DELETE" });
    router.push(hajiasalPath("/seller"));
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {seller ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6">
          <h3 className="mb-4 text-base font-semibold text-stone-900">
            اطلاعات فروشگاه
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-stone-100 pb-2">
              <dt className="shrink-0 text-stone-500">نام فروشگاه</dt>
              <dd className="min-w-0 break-words text-end font-medium text-stone-900">
                {seller.shopName}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-stone-100 pb-2">
              <dt className="shrink-0 text-stone-500">مسئول</dt>
              <dd className="min-w-0 break-words text-end font-medium text-stone-900">
                {seller.ownerName}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-stone-100 pb-2">
              <dt className="shrink-0 text-stone-500">موبایل</dt>
              <dd className="font-medium text-stone-900" dir="ltr">
                {seller.phone}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-stone-100 pb-2">
              <dt className="shrink-0 text-stone-500">شهر</dt>
              <dd className="font-medium text-stone-900">{seller.city}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-stone-100 pb-2">
              <dt className="shrink-0 text-stone-500">وضعیت</dt>
              <dd className="font-medium text-emerald-700">
                {seller.status === "active" ? "فعال" : seller.status}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-stone-500">عضویت</dt>
              <dd className="font-medium text-stone-900">
                {new Date(seller.joinedAt).toLocaleDateString("fa-IR")}
              </dd>
            </div>
          </dl>

          <p className="mt-6 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900/80">
            برای تغییر اطلاعات فروشگاه با پشتیبانی حاجی عسل هماهنگ کنید. مدیریت
            موجودی از بخش «موجودی» انجام می‌شود.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <AdminButton
              href={hajiasalPath("/shop")}
              variant="outline"
              className="w-full !border-stone-300 sm:w-auto"
            >
              مشاهده فروشگاه
            </AdminButton>
            <AdminButton
              type="button"
              variant="danger"
              onClick={() => void logout()}
              className="w-full sm:w-auto"
            >
              خروج از حساب
            </AdminButton>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      )}
    </div>
  );
}

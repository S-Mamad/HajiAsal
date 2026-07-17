"use client";

import { useEffect, useState } from "react";
import type { UserAddress } from "@/types/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import iranLocations from "@/data/iran-locations.json";

type LocationEntry = { province: string; cities: string[] };

export function AddressesPageClient() {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [label, setLabel] = useState("");

  const cities =
    (iranLocations as LocationEntry[]).find((l) => l.province === province)
      ?.cities ?? [];

  const load = () => {
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: label || undefined,
        province,
        city,
        address,
        postalCode,
        isDefault: addresses.length === 0,
      }),
    });
    setShowForm(false);
    setProvince("");
    setCity("");
    setAddress("");
    setPostalCode("");
    setLabel("");
    load();
  };

  const onDelete = async (id: string) => {
    await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
    load();
  };

  if (loading) return <p className="text-muted">در حال بارگذاری...</p>;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <SectionHeading title="آدرس‌های من" />
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "انصراف" : "آدرس جدید"}
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={onAdd} className="mb-8 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
          <Input label="برچسب (اختیاری)" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="خانه" />
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              setCity("");
            }}
            className="rounded-xl border border-border bg-cream px-4 py-3 text-sm"
          >
            <option value="">استان</option>
            {(iranLocations as LocationEntry[]).map((l) => (
              <option key={l.province} value={l.province}>
                {l.province}
              </option>
            ))}
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-xl border border-border bg-cream px-4 py-3 text-sm"
          >
            <option value="">شهر</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="کد پستی" dir="ltr" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          <Button type="submit">ذخیره آدرس</Button>
        </form>
      ) : null}

      <ul className="flex flex-col gap-3">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-2xl border border-border bg-surface p-4">
            {a.label ? <p className="text-xs font-medium text-amber">{a.label}</p> : null}
            <p className="text-sm text-brown">
              {a.province}، {a.city}
            </p>
            <p className="text-sm text-muted">{a.address}</p>
            <p className="text-xs text-muted" dir="ltr">
              {a.postalCode}
            </p>
            <button
              type="button"
              onClick={() => void onDelete(a.id)}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              حذف
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

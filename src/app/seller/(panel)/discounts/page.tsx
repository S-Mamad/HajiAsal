"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";

type Discount = {
  id: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
};

export default function SellerDiscountsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Discount[]>([]);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/discounts");
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    if (res.status === 403) {
      setForbidden(true);
      return;
    }
    const data = await res.json();
    setRows(data.discounts ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (forbidden) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        قابلیت تخفیف برای فروشگاه شما فعال نیست. از مدیر درخواست فعال‌سازی کنید.
      </p>
    );
  }

  const create = async () => {
    setError("");
    const res = await fetch("/api/seller/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "خطا");
      return;
    }
    setCode("");
    setValue("");
    await load();
  };

  const remove = async (id: string) => {
    await fetch("/api/seller/discounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex flex-wrap gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <Input label="کد" value={code} onChange={(e) => setCode(e.target.value)} />
        <Input label="مقدار" value={value} onChange={(e) => setValue(e.target.value)} type="number" />
        <label className="text-sm">
          <span className="mb-1 block text-stone-600">نوع</span>
          <select
            className="rounded-lg border border-stone-200 px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed")}
          >
            <option value="percent">درصدی</option>
            <option value="fixed">مبلغی</option>
          </select>
        </label>
        <AdminButton onClick={() => void create()}>ایجاد</AdminButton>
      </div>
      <SellerDataTable
        storageKey="seller.discounts.grid"
        columns={[
          { key: "code", header: "کد", render: (r) => r.code },
          { key: "type", header: "نوع", render: (r) => r.type },
          { key: "value", header: "مقدار", render: (r) => r.value },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <button
                type="button"
                className="text-sm text-rose-700"
                onClick={() => void remove(r.id)}
              >
                حذف
              </button>
            ),
          },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        emptyMessage="تخفیفی نیست"
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

export default function SellerInventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [outOfStock, setOutOfStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/inventory");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setProducts(data.products ?? []);
      setOutOfStock(data.outOfStock ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (productId: string, inStock: boolean) => {
    setBusyId(productId);
    setError("");
    try {
      const res = await fetch("/api/seller/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, inStock: !inStock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در تغییر موجودی");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          {outOfStock.toLocaleString("fa-IR")} محصول ناموجود
        </p>
        <AdminButton
          type="button"
          variant="outline"
          onClick={() => void load()}
          className="!border-stone-300"
        >
          بروزرسانی
        </AdminButton>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      ) : null}
      <DataTable
        data={products}
        rowKey={(p) => p.id}
        emptyMessage="محصولی نیست"
        minWidth={false}
        className="!border-stone-200"
        columns={[
          {
            key: "title",
            header: "محصول",
            render: (p) => p.title,
          },
          {
            key: "status",
            header: "وضعیت",
            render: (p) =>
              p.inStock ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                  موجود
                </span>
              ) : (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-600">
                  ناموجود
                </span>
              ),
          },
          {
            key: "action",
            header: "عملیات",
            render: (p) => (
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === p.id}
                onClick={() => void toggle(p.id, p.inStock)}
                className="!border-stone-300"
                aria-label={p.inStock ? "ناموجود کردن" : "موجود کردن"}
              >
                {busyId === p.id ? "..." : p.inStock ? "ناموجود" : "موجود"}
              </AdminButton>
            ),
          },
        ]}
      />
    </div>
  );
}

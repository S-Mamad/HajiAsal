"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

type InvProduct = Product & { stockQty?: number; lowStock?: boolean };

type Movement = {
  id: string;
  delta: number;
  qtyAfter: number;
  reason?: string;
  note?: string;
  createdAt: string;
};

export default function SellerInventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<InvProduct[]>([]);
  const [outOfStock, setOutOfStock] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyProduct, setHistoryProduct] = useState<InvProduct | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      setLowStock(data.lowStock ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = async (p: InvProduct) => {
    setHistoryProduct(p);
    setHistoryLoading(true);
    setMovements([]);
    try {
      const res = await fetch(
        `/api/seller/inventory?productId=${encodeURIComponent(p.id)}`,
      );
      const data = await res.json();
      if (res.ok) setMovements(data.movements ?? []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const adjust = async (productId: string, delta: number) => {
    setBusyId(productId);
    setError("");
    try {
      const res = await fetch("/api/seller/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, delta, reason: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در تغییر موجودی");
      await load();
      if (historyProduct?.id === productId) {
        await openHistory(historyProduct);
      }
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
          ناموجود: {outOfStock.toLocaleString("fa-IR")} · کم‌موجود:{" "}
          {lowStock.toLocaleString("fa-IR")}
        </p>
        <AdminButton variant="outline" onClick={() => void load()}>
          بروزرسانی
        </AdminButton>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <SellerDataTable
        storageKey="seller.inventory.grid.v1"
        loading={loading}
        error={error || null}
        onRetry={() => void load()}
        searchable
        searchPlaceholder="جستجوی محصول..."
        searchKeys={(p) => `${p.title} ${p.id}`}
        data={products}
        rowKey={(p) => p.id}
        emptyMessage="محصولی نیست"
        columns={[
          {
            key: "title",
            header: "محصول",
            render: (p) => (
              <span className={p.lowStock ? "font-medium text-amber-800" : ""}>
                {p.title}
              </span>
            ),
          },
          {
            key: "qty",
            header: "موجودی",
            render: (p) => (
              <span className="tabular-nums">{p.stockQty ?? 0}</span>
            ),
          },
          {
            key: "action",
            header: "عملیات",
            render: (p) => (
              <div className="flex flex-wrap gap-1">
                <AdminButton
                  variant="outline"
                  size="sm"
                  disabled={busyId === p.id}
                  onClick={() => void adjust(p.id, 1)}
                >
                  +۱
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  disabled={busyId === p.id}
                  onClick={() => void adjust(p.id, -1)}
                >
                  −۱
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => void openHistory(p)}
                >
                  تاریخچه
                </AdminButton>
              </div>
            ),
          },
        ]}
      />

      {historyProduct ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-stone-900">
                تاریخچه موجودی · {historyProduct.title}
              </h3>
              <AdminButton
                size="sm"
                variant="ghost"
                onClick={() => setHistoryProduct(null)}
              >
                بستن
              </AdminButton>
            </div>
            {historyLoading ? (
              <p className="text-sm text-stone-500">در حال بارگذاری...</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-stone-500">
                حرکتی ثبت نشده (نیاز به MySQL و migration)
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {movements.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-stone-100 px-3 py-2"
                  >
                    <div className="flex justify-between gap-2">
                      <span
                        className={
                          m.delta >= 0 ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {m.delta >= 0 ? "+" : ""}
                        {m.delta}
                      </span>
                      <span className="text-stone-400">
                        بعد: {m.qtyAfter}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500">
                      {m.reason ?? "manual"}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                    <p className="text-xs text-stone-400">
                      {new Date(m.createdAt).toLocaleString("fa-IR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

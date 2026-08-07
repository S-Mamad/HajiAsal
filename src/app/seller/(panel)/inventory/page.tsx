"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

type InvProduct = Product & {
  stockQty?: number | null;
  stockTracked?: boolean;
  lowStock?: boolean;
  displayStock?: string;
};

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

  useEffect(() => {
    if (!historyProduct) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoryProduct(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyProduct]);

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
        <p className="text-sm text-zinc-500">
          ناموجود: {outOfStock.toLocaleString("fa-IR")} · کم‌موجود:{" "}
          {lowStock.toLocaleString("fa-IR")}
        </p>
        <AdminButton variant="outline" onClick={() => void load()}>
          بروزرسانی
        </AdminButton>
      </div>
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

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
        emptyMessage="محصولی برای مدیریت موجودی نیست"
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
              <span className="tabular-nums">
                {p.displayStock ??
                  (typeof p.stockQty === "number"
                    ? p.stockQty
                    : p.inStock
                      ? "نامحدود"
                      : "۰")}
              </span>
            ),
          },
          {
            key: "action",
            header: "عملیات",
            render: (p) => {
              const unlimited =
                !p.stockTracked && typeof p.stockQty !== "number" && p.inStock;
              return (
                <div className="flex flex-wrap gap-1">
                  <AdminButton
                    variant="outline"
                    size="sm"
                    disabled={busyId === p.id}
                    onClick={() => void adjust(p.id, 1)}
                    title={
                      unlimited
                        ? "تبدیل به موجودی عددی (شروع از ۱)"
                        : undefined
                    }
                  >
                    +۱
                  </AdminButton>
                  <AdminButton
                    variant="outline"
                    size="sm"
                    disabled={busyId === p.id || unlimited}
                    onClick={() => void adjust(p.id, -1)}
                    title={
                      unlimited
                        ? "ابتدا موجودی عددی تعیین کنید"
                        : undefined
                    }
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
              );
            },
          },
        ]}
      />

      {historyProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="تاریخچه موجودی"
          onClick={() => setHistoryProduct(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-semibold text-zinc-900">
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
              <p className="text-sm text-zinc-500">در حال بارگذاری...</p>
            ) : movements.length === 0 ? (
              <p className="text-sm text-zinc-500">
                هنوز حرکتی برای این محصول ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {movements.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg border border-zinc-100 px-3 py-2"
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
                      <span className="text-zinc-400">بعد: {m.qtyAfter}</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {m.reason ?? "manual"}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                    <p className="text-xs text-zinc-400">
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

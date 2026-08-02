"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { Product } from "@/types";
import { hajiasalPath } from "@/lib/paths";

export default function AdminInventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/inventory");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "??? ?? ????????");
      setProducts(data.products ?? []);
      setLowStockCount(data.lowStockCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "???");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStock = async (product: Product) => {
    setBusyId(product.id);
    setError("");
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          inStock: !product.inStock,
          reason: "admin_toggle",
        }),
      });
      if (!res.ok) throw new Error("??? ?? ????? ??????");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "???");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <p className="text-sm text-zinc-500">
        {lowStockCount.toLocaleString("fa-IR")} ????? ??????? / ????????
      </p>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <DataTable
        data={products}
        rowKey={(r) => r.id}
        emptyMessage="?????? ???? ???"
        minWidth={false}
        loading={loading}
        error={error || null}
        onRetry={() => void load()}
        columns={[
          {
            key: "title",
            header: "?????",
            sortable: true,
            getSortValue: (r) => r.title,
            render: (r) => r.title,
          },
          {
            key: "stock",
            header: "????? ??????",
            className: "w-[10rem]",
            sortable: true,
            getSortValue: (r) => (r.inStock ? 1 : 0),
            render: (r) => (
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === r.id}
                onClick={() => void toggleStock(r)}
              >
                {busyId === r.id ? "..." : r.inStock ? "?????" : "???????"}
              </AdminButton>
            ),
          },
        ]}
      />
    </div>
  );
}

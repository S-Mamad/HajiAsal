"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Icon } from "@/components/ui/Icon";
import { getMinPrice } from "@/lib/products";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

type StockFilter = "all" | "in_stock" | "out_of_stock";

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in_stock" && product.inStock) ||
        (stockFilter === "out_of_stock" && !product.inStock);
      if (!matchesStock) return false;
      if (!query) return true;
      return (
        product.title.toLowerCase().includes(query) ||
        product.slug.toLowerCase().includes(query) ||
        product.categoryLabel.toLowerCase().includes(query)
      );
    });
  }, [products, search, stockFilter]);

  const toggleStock = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inStock: !product.inStock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در به‌روزرسانی");
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? data.product : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در به‌روزرسانی");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filteredProducts.length.toLocaleString("fa-IR")} محصول
        </p>
        <AdminButton type="button" variant="outline" onClick={() => void loadProducts()}>
          بروزرسانی
        </AdminButton>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Icon
            icon={MagnifyingGlass}
            size={16}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام یا دسته..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pe-3 ps-9 text-sm outline-none focus:border-slate-400"
          />
        </label>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          aria-label="فیلتر موجودی"
        >
          <option value="all">همه محصولات</option>
          <option value="in_stock">موجود</option>
          <option value="out_of_stock">ناموجود</option>
        </select>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      <DataTable
        data={filteredProducts}
        rowKey={(row) => row.id}
        emptyMessage="محصولی یافت نشد"
        columns={[
          {
            key: "title",
            header: "محصول",
            render: (row) => (
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-slate-400" dir="ltr">
                  {row.slug}
                </p>
              </div>
            ),
          },
          {
            key: "category",
            header: "دسته",
            render: (row) => row.categoryLabel,
          },
          {
            key: "price",
            header: "قیمت از",
            render: (row) =>
              `${getMinPrice(row).toLocaleString("fa-IR")} تومان`,
          },
          {
            key: "rating",
            header: "امتیاز",
            render: (row) => row.rating.toLocaleString("fa-IR"),
          },
          {
            key: "stock",
            header: "موجودی",
            render: (row) => (
              <AdminButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void toggleStock(row)}
                className={
                  row.inStock
                    ? "!text-emerald-700 hover:!bg-emerald-50"
                    : "!text-rose-700 hover:!bg-rose-50"
                }
              >
                {row.inStock ? "موجود" : "ناموجود"}
              </AdminButton>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <AdminButton
                  href={hajiasalPath(`/admin/products/${row.id}`)}
                  variant="ghost"
                  size="sm"
                >
                  ویرایش
                </AdminButton>
                <AdminButton
                  href={hajiasalPath(`/product/${row.slug}`)}
                  variant="ghost"
                  size="sm"
                  external
                  className="!text-slate-500"
                >
                  مشاهده
                </AdminButton>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

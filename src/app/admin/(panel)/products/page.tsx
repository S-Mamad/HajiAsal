"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmModal } from "@/components/admin/ui/AdminModal";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { getMinPrice } from "@/lib/products";
import { hajiasalPath } from "@/lib/paths";
import { exportToCsv, exportToExcel } from "@/lib/admin/export";
import type { Product } from "@/types";

type StockFilter = "all" | "in_stock" | "out_of_stock";

export default function AdminProductsPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", { credentials: "include" });
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
    return products.filter((product) => {
      if (stockFilter === "in_stock") return product.inStock;
      if (stockFilter === "out_of_stock") return !product.inStock;
      return true;
    });
  }, [products, stockFilter]);

  const toggleStock = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inStock: !product.inStock }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در به‌روزرسانی");
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? data.product : p)),
      );
      toast.success("موجودی به‌روز شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در به‌روزرسانی");
    }
  };

  const bulkDelete = async () => {
    setDeleting(true);
    try {
      for (const id of selected) {
        const res = await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "حذف ناموفق");
        }
      }
      toast.success("حذف گروهی انجام شد");
      setSelected([]);
      setConfirmOpen(false);
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        data={filteredProducts}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={loadProducts}
        emptyMessage="محصولی یافت نشد"
        searchable
        searchPlaceholder="جستجو نام، اسلاگ، دسته..."
        searchKeys={(row) =>
          `${row.title} ${row.slug} ${row.categoryLabel}`
        }
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
              aria-label="فیلتر موجودی"
            >
              <option value="all">همه</option>
              <option value="in_stock">موجود</option>
              <option value="out_of_stock">ناموجود</option>
            </select>
            <Can permission="products.create">
              <AdminButton href={hajiasalPath("/admin/products/new")}>
                محصول جدید
              </AdminButton>
            </Can>
            <AdminButton
              variant="outline"
              onClick={() =>
                exportToCsv(
                  "products",
                  filteredProducts.map((p) => ({
                    id: p.id,
                    title: p.title,
                    slug: p.slug,
                    category: p.categoryLabel,
                    price: getMinPrice(p),
                    inStock: p.inStock,
                  })),
                )
              }
            >
              CSV
            </AdminButton>
            <AdminButton
              variant="outline"
              onClick={() =>
                exportToExcel(
                  "products",
                  filteredProducts.map((p) => ({
                    id: p.id,
                    title: p.title,
                    slug: p.slug,
                    category: p.categoryLabel,
                    price: getMinPrice(p),
                    inStock: p.inStock,
                  })),
                )
              }
            >
              Excel
            </AdminButton>
          </div>
        }
        bulkActions={
          <Can permission="products.bulk">
            <AdminButton variant="danger" onClick={() => setConfirmOpen(true)}>
              حذف گروهی
            </AdminButton>
          </Can>
        }
        columns={[
          {
            key: "title",
            header: "محصول",
            sortable: true,
            render: (row) => (
              <div>
                <p className="font-medium">{row.title}</p>
                <p className="text-xs text-stone-400" dir="ltr">
                  {row.slug}
                </p>
              </div>
            ),
          },
          {
            key: "category",
            header: "دسته",
            hideOnMobile: true,
            render: (row) => row.categoryLabel,
          },
          {
            key: "price",
            header: "قیمت از",
            render: (row) =>
              `${getMinPrice(row).toLocaleString("fa-IR")} تومان`,
          },
          {
            key: "stock",
            header: "موجودی",
            render: (row) => (
              <Can permission="products.edit" fallback={row.inStock ? "موجود" : "ناموجود"}>
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
              </Can>
            ),
          },
          {
            key: "actions",
            header: "عملیات",
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
                >
                  مشاهده
                </AdminButton>
              </div>
            ),
          },
        ]}
      />

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void bulkDelete()}
        title="حذف محصولات"
        description={`${selected.length} محصول حذف می‌شود.`}
        confirmLabel="حذف"
        danger
        loading={deleting}
      />
    </div>
  );
}

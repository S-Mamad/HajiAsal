"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmModal } from "@/components/admin/ui/AdminModal";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { getMinPrice } from "@/lib/products";
import { hajiasalPath } from "@/lib/paths";
import type { Product, ProductStatus } from "@/types";

type StockFilter = "all" | "in_stock" | "out_of_stock";
type ListMode = "active" | "trash";

const STATUS_LABEL: Record<ProductStatus, string> = {
  active: "فعال",
  draft: "پیش‌نویس",
  archived: "آرشیو",
  disabled: "غیرفعال",
};

export default function AdminProductsPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [listMode, setListMode] = useState<ListMode>("active");
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchProducts = useCallback(async (): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (listMode === "trash") params.set("trash", "1");
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/products?${params}`, {
      credentials: "include",
    });
    if (res.status === 401) {
      router.push(hajiasalPath("/admin"));
      return [];
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
    return data.products ?? [];
  }, [router, listMode, statusFilter]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [fetchProducts]);

  useEffect(() => {
    let cancelled = false;
    void fetchProducts()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "خطای ناشناخته");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProducts]);

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

  const bulkAction = async (
    operation:
      | { action: "trash" }
      | { action: "restore" }
      | { action: "purge" }
      | { action: "set_status"; status: ProductStatus }
      | { action: "set_stock"; inStock: boolean },
  ) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selected, operation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "عملیات ناموفق");
      toast.success(`${data.ok ?? 0} محصول به‌روز شد`);
      setSelected([]);
      setConfirmOpen(false);
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("dryRun", "false");
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در import");
      toast.success(
        `ایجاد: ${data.created} | به‌روز: ${data.updated} | رد: ${data.skipped}`,
      );
      await loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImport(file);
          e.target.value = "";
        }}
      />

      <DataTable
        data={filteredProducts}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={loadProducts}
        emptyMessage={listMode === "trash" ? "سطل زباله خالی است" : "محصولی یافت نشد"}
        searchable
        searchPlaceholder="جستجو نام، اسلاگ، دسته..."
        searchKeys={(row) =>
          `${row.title} ${row.slug} ${row.categoryLabel} ${row.sku ?? ""}`
        }
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        toolbar={
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl border border-stone-200 p-0.5">
              <button
                type="button"
                onClick={() => setListMode("active")}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  listMode === "active"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600"
                }`}
              >
                فهرست
              </button>
              <button
                type="button"
                onClick={() => setListMode("trash")}
                className={`rounded-lg px-3 py-1.5 text-xs ${
                  listMode === "trash"
                    ? "bg-stone-900 text-white"
                    : "text-stone-600"
                }`}
              >
                سطل زباله
              </button>
            </div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
              aria-label="فیلتر موجودی"
            >
              <option value="all">همه موجودی</option>
              <option value="in_stock">موجود</option>
              <option value="out_of_stock">ناموجود</option>
            </select>
            {listMode === "active" ? (
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ProductStatus | "all")
                }
                className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm"
                aria-label="فیلتر وضعیت"
              >
                <option value="all">همه وضعیت</option>
                <option value="active">فعال</option>
                <option value="draft">پیش‌نویس</option>
                <option value="archived">آرشیو</option>
                <option value="disabled">غیرفعال</option>
              </select>
            ) : null}
            <Can permission="products.create">
              <AdminButton href={hajiasalPath("/admin/products/new")}>
                محصول جدید
              </AdminButton>
            </Can>
            <Can permission="products.import_export">
              <AdminButton
                variant="outline"
                href="/api/admin/products/export"
                external
              >
                Export CSV
              </AdminButton>
              <AdminButton
                variant="outline"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Import CSV
              </AdminButton>
            </Can>
          </div>
        }
        bulkActions={
          selected.length > 0 ? (
            <Can permission="products.bulk">
              <div className="flex flex-wrap gap-2">
                {listMode === "active" ? (
                  <>
                    <AdminButton
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void bulkAction({ action: "set_status", status: "active" })
                      }
                    >
                      فعال‌سازی
                    </AdminButton>
                    <AdminButton
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void bulkAction({ action: "set_status", status: "draft" })
                      }
                    >
                      پیش‌نویس
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirmOpen(true)}
                    >
                      انتقال به سطل
                    </AdminButton>
                  </>
                ) : (
                  <>
                    <AdminButton
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void bulkAction({ action: "restore" })}
                    >
                      بازیابی
                    </AdminButton>
                    <AdminButton
                      variant="danger"
                      size="sm"
                      disabled={busy}
                      onClick={() => void bulkAction({ action: "purge" })}
                    >
                      حذف دائمی
                    </AdminButton>
                  </>
                )}
              </div>
            </Can>
          ) : null
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
            key: "status",
            header: "وضعیت",
            hideOnMobile: true,
            render: (row) => STATUS_LABEL[row.status ?? "active"],
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
        onConfirm={() => void bulkAction({ action: "trash" })}
        title="انتقال به سطل زباله"
        description={`${selected.length} محصول به سطل زباله منتقل می‌شود.`}
        confirmLabel="انتقال"
        danger
        loading={busy}
      />
    </div>
  );
}

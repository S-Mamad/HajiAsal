"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  SellerDataTable,
  SellerEmpty,
} from "@/components/seller/ui/SellerDataTable";
import { SellerSavedFiltersBar } from "@/components/seller/ui/SellerSavedFiltersBar";
import { SellerEntityHistory } from "@/components/seller/ui/SellerEntityHistory";
import { exportToCsv, exportToJson, printHtml } from "@/lib/admin/export";
import { hajiasalPath } from "@/lib/paths";
import type { Product, ProductApprovalStatus } from "@/types";

const APPROVAL_LABELS: Record<ProductApprovalStatus, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده",
};

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [historyId, setHistoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/products");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== "all" && (p.status ?? "active") !== statusFilter) {
        return false;
      }
      if (
        approvalFilter !== "all" &&
        (p.approvalStatus ?? "approved") !== approvalFilter
      ) {
        return false;
      }
      const qty = p.stockQty ?? (p.inStock ? 1 : 0);
      if (stockFilter === "out" && qty > 0) return false;
      if (stockFilter === "in" && qty <= 0) return false;
      if (stockFilter === "low" && qty > 10) return false;
      return true;
    });
  }, [products, statusFilter, approvalFilter, stockFilter]);

  const selectedRows = filtered.filter((p) => selected.includes(p.id));

  const duplicate = async (id: string) => {
    setMessage("");
    const res = await fetch("/api/seller/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate", productId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "کپی ناموفق");
      return;
    }
    setMessage("محصول کپی شد");
    await load();
  };

  const remove = async (ids: string[]) => {
    if (!ids.length) return;
    if (!window.confirm(`حذف ${ids.length} محصول؟`)) return;
    const res = await fetch("/api/seller/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "حذف ناموفق");
      return;
    }
    setMessage(`${data.deleted ?? 0} محصول حذف شد`);
    setSelected([]);
    await load();
  };

  const bulkStatus = async (status: "archived" | "disabled" | "active") => {
    if (!selected.length) return;
    const res = await fetch("/api/seller/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: selected, bulkStatus: status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "خطا");
      return;
    }
    setMessage(`${data.updated ?? 0} محصول به‌روز شد`);
    setSelected([]);
    await load();
  };

  const exportSelected = (format: "csv" | "json") => {
    if (!selectedRows.length) {
      setError("حداقل یک ردیف انتخاب کنید");
      return;
    }
    const rows = selectedRows.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status ?? "active",
      approval: p.approvalStatus ?? "",
      stock: p.stockQty ?? (p.inStock ? 1 : 0),
      price: p.weightOptions[0]?.price ?? "",
    }));
    if (format === "csv") exportToCsv("seller-products-selected.csv", rows);
    else exportToJson("seller-products-selected.json", rows);
  };

  const printSelected = () => {
    if (!selectedRows.length) {
      setError("حداقل یک ردیف انتخاب کنید");
      return;
    }
    const body = selectedRows
      .map(
        (p) =>
          `<div style="margin-bottom:16px;border-bottom:1px solid #ddd;padding-bottom:8px">
            <strong>${p.title}</strong><br/>
            شناسه: ${p.id} · موجودی: ${p.stockQty ?? 0} · وضعیت: ${p.status ?? "active"}
          </div>`,
      )
      .join("");
    printHtml("لیست محصولات انتخاب‌شده", body);
  };

  const filterPayload = {
    statusFilter,
    approvalFilter,
    stockFilter,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          فقط محصولات فروشگاه شما · تأیید نهایی با ادمین
        </p>
        <div className="flex flex-wrap gap-2">
          <AdminButton href={hajiasalPath("/seller/products/new")}>
            افزودن محصول
          </AdminButton>
          <AdminButton variant="outline" onClick={() => void load()}>
            بروزرسانی
          </AdminButton>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm">
        <label className="flex items-center gap-1.5">
          انتشار
          <select
            className="rounded-md border border-stone-200 px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">همه</option>
            <option value="active">فعال</option>
            <option value="draft">پیش‌نویس</option>
            <option value="archived">بایگانی</option>
            <option value="disabled">غیرفعال</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          تأیید
          <select
            className="rounded-md border border-stone-200 px-2 py-1"
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
          >
            <option value="all">همه</option>
            <option value="pending">در انتظار</option>
            <option value="approved">تأیید شده</option>
            <option value="rejected">رد شده</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          موجودی
          <select
            className="rounded-md border border-stone-200 px-2 py-1"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">همه</option>
            <option value="in">موجود</option>
            <option value="low">کم</option>
            <option value="out">ناموجود</option>
          </select>
        </label>
      </div>

      <SellerSavedFiltersBar
        moduleKey="products"
        currentPayload={filterPayload}
        onApply={(payload) => {
          if (typeof payload.statusFilter === "string") {
            setStatusFilter(payload.statusFilter);
          }
          if (typeof payload.approvalFilter === "string") {
            setApprovalFilter(payload.approvalFilter);
          }
          if (typeof payload.stockFilter === "string") {
            setStockFilter(payload.stockFilter);
          }
        }}
      />

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-sm text-amber-900">
            {selected.length} انتخاب‌شده
          </span>
          <AdminButton size="sm" variant="outline" onClick={() => void bulkStatus("archived")}>
            بایگانی
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => void bulkStatus("disabled")}>
            غیرفعال
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => void bulkStatus("active")}>
            فعال
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => exportSelected("csv")}>
            CSV
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => exportSelected("json")}>
            JSON
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={printSelected}>
            چاپ
          </AdminButton>
          <AdminButton size="sm" variant="danger" onClick={() => void remove(selected)}>
            حذف
          </AdminButton>
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <SellerEmpty
          title="محصولی نیست"
          description="اولین محصول را بسازید یا فیلترها را پاک کنید"
        >
          <AdminButton href={hajiasalPath("/seller/products/new")}>
            افزودن محصول
          </AdminButton>
        </SellerEmpty>
      ) : (
        <SellerDataTable
          storageKey="seller.products.grid.v2"
          loading={loading}
          error={error || null}
          onRetry={() => void load()}
          searchable
          searchPlaceholder="جستجوی عنوان محصول..."
          searchKeys={(p) =>
            `${p.title} ${p.categoryLabel} ${p.slug} ${p.id}`
          }
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          columns={[
            {
              key: "title",
              header: "محصول",
              render: (p) => (
                <div>
                  <Link
                    href={hajiasalPath(`/seller/products/${p.id}`)}
                    className="font-medium text-amber-950 hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-stone-400">{p.categoryLabel}</p>
                </div>
              ),
            },
            {
              key: "approval",
              header: "تأیید",
              render: (p) =>
                APPROVAL_LABELS[(p.approvalStatus ?? "approved") as ProductApprovalStatus],
            },
            {
              key: "status",
              header: "انتشار",
              render: (p) => p.status ?? "active",
            },
            {
              key: "stock",
              header: "موجودی",
              render: (p) => (
                <span className="tabular-nums">
                  {p.stockQty ?? (p.inStock ? 1 : 0)}
                </span>
              ),
            },
            {
              key: "price",
              header: "قیمت",
              render: (p) => {
                const prices = p.weightOptions?.map((w) => w.price) ?? [];
                if (!prices.length) return "-";
                return `${Math.min(...prices).toLocaleString("fa-IR")} تومان`;
              },
            },
            {
              key: "actions",
              header: "عملیات",
              render: (p) => (
                <div className="flex flex-wrap gap-1">
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    href={hajiasalPath(`/seller/products/${p.id}`)}
                  >
                    مشاهده
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    href={hajiasalPath(`/seller/products/${p.id}/edit`)}
                  >
                    ویرایش
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => void duplicate(p.id)}
                  >
                    کپی
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setHistoryId(p.id)}
                  >
                    تاریخچه
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => void remove([p.id])}
                  >
                    حذف
                  </AdminButton>
                </div>
              ),
            },
          ]}
          data={filtered}
          rowKey={(p) => p.id}
          emptyMessage="محصولی با این فیلتر نیست"
        />
      )}

      <SellerEntityHistory
        entityType="product"
        entityId={historyId ?? ""}
        open={Boolean(historyId)}
        onClose={() => setHistoryId(null)}
      />
    </div>
  );
}

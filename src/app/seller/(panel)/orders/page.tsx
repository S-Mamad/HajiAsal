"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  SellerDataTable,
  SellerEmpty,
} from "@/components/seller/ui/SellerDataTable";
import { SellerSavedFiltersBar } from "@/components/seller/ui/SellerSavedFiltersBar";
import { SellerEntityHistory } from "@/components/seller/ui/SellerEntityHistory";
import { exportToCsv, exportToJson, printHtml } from "@/lib/admin/export";
import { hajiasalPath } from "@/lib/paths";
import type { OrderStatus } from "@/lib/server/orders";

interface SellerOrder {
  id: string;
  status: OrderStatus;
  customer: { fullName: string; phone: string; city: string };
  sellerSubtotal: number;
  sellerItems: Array<{
    title: string;
    quantity: number;
    weight: { label: string };
  }>;
  createdAt: string;
  trackingCode?: string;
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [historyId, setHistoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/orders");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setOrders(data.orders ?? []);
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
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const selectedRows = filtered.filter((o) => selected.includes(o.id));

  const bulkAction = async (action: "bulkConfirm" | "bulkPrepare") => {
    if (!selected.length) return;
    setMessage("");
    const res = await fetch("/api/seller/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds: selected, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "خطا");
      return;
    }
    setMessage(`${data.updated ?? 0} سفارش به‌روز شد`);
    setSelected([]);
    await load();
  };

  const exportSelected = (format: "csv" | "json") => {
    if (!selectedRows.length) {
      setError("حداقل یک ردیف انتخاب کنید");
      return;
    }
    const rows = selectedRows.map((o) => ({
      id: o.id,
      customer: o.customer.fullName,
      city: o.customer.city,
      status: o.status,
      amount: o.sellerSubtotal,
      date: o.createdAt,
      tracking: o.trackingCode ?? "",
    }));
    if (format === "csv") exportToCsv("seller-orders-selected.csv", rows);
    else exportToJson("seller-orders-selected.json", rows);
  };

  const printSelected = () => {
    if (!selectedRows.length) {
      setError("حداقل یک ردیف انتخاب کنید");
      return;
    }
    const body = selectedRows
      .map(
        (o) =>
          `<div style="margin-bottom:16px;border-bottom:1px solid #ddd;padding-bottom:8px">
            <strong>${o.id}</strong> · ${o.customer.fullName} · ${o.customer.city}<br/>
            مبلغ: ${o.sellerSubtotal.toLocaleString("fa-IR")} تومان · وضعیت: ${o.status}<br/>
            ${o.sellerItems.map((i) => `${i.title} × ${i.quantity}`).join(" · ")}
          </div>`,
      )
      .join("");
    printHtml("سفارش‌های انتخاب‌شده", body);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          فقط سفارش‌هایی که شامل محصولات شما هستند
        </p>
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="outline" onClick={() => void load()}>
            بروزرسانی
          </AdminButton>
          <AdminButton
            href="/api/seller/orders/export"
            variant="outline"
            external
            download
          >
            خروجی CSV همه
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
          وضعیت
          <select
            className="rounded-md border border-stone-200 px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">همه</option>
            <option value="pending">در انتظار</option>
            <option value="confirmed">تأیید شده</option>
            <option value="processing">در حال آماده‌سازی</option>
            <option value="shipped">ارسال شده</option>
            <option value="delivered">تحویل شده</option>
            <option value="cancelled">لغو شده</option>
          </select>
        </label>
      </div>

      <SellerSavedFiltersBar
        moduleKey="orders"
        currentPayload={{ statusFilter }}
        onApply={(payload) => {
          if (typeof payload.statusFilter === "string") {
            setStatusFilter(payload.statusFilter);
          }
        }}
      />

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-sm text-amber-900">
            {selected.length} انتخاب‌شده
          </span>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => void bulkAction("bulkConfirm")}
          >
            تأیید گروهی
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => void bulkAction("bulkPrepare")}
          >
            آماده‌سازی گروهی
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => exportSelected("csv")}
          >
            CSV
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => exportSelected("json")}
          >
            JSON
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={printSelected}>
            چاپ
          </AdminButton>
        </div>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <SellerEmpty
          title="سفارشی نیست"
          description="هنوز سفارشی با محصولات شما ثبت نشده یا فیلتر خالی است"
        />
      ) : (
        <SellerDataTable
          storageKey="seller.orders.grid.v2"
          loading={loading}
          error={error || null}
          onRetry={() => void load()}
          searchable
          searchPlaceholder="جستجوی شناسه، مشتری، شهر..."
          searchKeys={(o) =>
            `${o.id} ${o.customer.fullName} ${o.customer.phone} ${o.customer.city} ${o.trackingCode ?? ""}`
          }
          selectable
          selectedKeys={selected}
          onSelectionChange={setSelected}
          columns={[
            {
              key: "id",
              header: "شناسه",
              render: (r) => (
                <Link
                  href={hajiasalPath(`/seller/orders/${r.id}`)}
                  className="font-mono text-xs text-amber-900 hover:underline"
                  dir="ltr"
                >
                  {r.id}
                </Link>
              ),
            },
            {
              key: "customer",
              header: "مشتری",
              render: (r) => (
                <div>
                  <p className="font-medium">{r.customer.fullName}</p>
                  <p className="text-xs text-stone-400">{r.customer.city}</p>
                </div>
              ),
            },
            {
              key: "items",
              header: "اقلام شما",
              render: (r) => (
                <ul className="space-y-0.5 text-xs text-stone-600">
                  {r.sellerItems.map((item, i) => (
                    <li key={`${r.id}-${i}`}>
                      {item.title} · {item.weight.label} ×{" "}
                      {item.quantity.toLocaleString("fa-IR")}
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              key: "total",
              header: "مبلغ سهم",
              render: (r) =>
                `${r.sellerSubtotal.toLocaleString("fa-IR")} تومان`,
            },
            {
              key: "status",
              header: "وضعیت",
              render: (r) => <StatusBadge status={r.status} />,
            },
            {
              key: "date",
              header: "تاریخ",
              render: (r) =>
                new Date(r.createdAt).toLocaleDateString("fa-IR"),
            },
            {
              key: "actions",
              header: "عملیات",
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    href={hajiasalPath(`/seller/orders/${r.id}`)}
                  >
                    جزئیات
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    href={`/api/orders/${r.id}/invoice?print=1`}
                    external
                    target="_blank"
                  >
                    فاکتور
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    onClick={() => setHistoryId(r.id)}
                  >
                    تاریخچه
                  </AdminButton>
                </div>
              ),
            },
          ]}
          data={filtered}
          rowKey={(r) => r.id}
          emptyMessage="سفارشی با این فیلتر نیست"
        />
      )}

      <SellerEntityHistory
        entityType="order"
        entityId={historyId ?? ""}
        open={Boolean(historyId)}
        onClose={() => setHistoryId(null)}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import { exportToCsv } from "@/lib/admin/export";
import { useSellerCan } from "@/components/seller/layout/SellerCapabilitiesContext";

const REPORT_TYPES = [
  { id: "sales", label: "فروش" },
  { id: "orders", label: "سفارش‌ها" },
  { id: "products", label: "محصولات" },
  { id: "customers", label: "مشتریان" },
] as const;

export default function SellerReportsPage() {
  const router = useRouter();
  const canExport = useSellerCan("reports.export");
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]["id"]>("sales");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/reports?type=${type}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setRows([]);
        setTotal(null);
        setError(data.error ?? "دسترسی به این گزارش برای شما فعال نیست");
        return;
      }
      if (!res.ok) {
        setRows([]);
        setTotal(null);
        setError(data.error ?? "خطا در بارگذاری گزارش");
        return;
      }
      setRows(data.rows ?? []);
      setTotal(typeof data.total === "number" ? data.total : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [type, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((t) => (
          <AdminButton
            key={t.id}
            variant={type === t.id ? "primary" : "outline"}
            onClick={() => setType(t.id)}
          >
            {t.label}
          </AdminButton>
        ))}
        {canExport ? (
          <AdminButton
            variant="outline"
            disabled={!rows.length}
            onClick={() =>
              exportToCsv(
                `seller-report-${type}.csv`,
                rows.map((r) => {
                  const out: Record<
                    string,
                    string | number | boolean | null | undefined
                  > = {};
                  for (const [k, v] of Object.entries(r)) {
                    if (
                      typeof v === "string" ||
                      typeof v === "number" ||
                      typeof v === "boolean" ||
                      v == null
                    ) {
                      out[k] = v;
                    } else {
                      out[k] = JSON.stringify(v);
                    }
                  }
                  return out;
                }),
              )
            }
          >
            خروجی CSV
          </AdminButton>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      ) : null}

      {total != null ? (
        <p className="text-sm text-stone-500">
          مجموع: {total.toLocaleString("fa-IR")}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              {rows[0]
                ? Object.keys(rows[0]).map((k) => (
                    <th key={k} className="px-3 py-2 text-right font-medium">
                      {k}
                    </th>
                  ))
                : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-stone-100">
                {Object.values(row).map((v, i) => (
                  <td key={i} className="px-3 py-2">
                    {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">داده‌ای برای این گزارش نیست</p>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import { exportToCsv } from "@/lib/admin/export";

export default function SellerReportsPage() {
  const router = useRouter();
  const [type, setType] = useState("sales");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/seller/reports?type=${type}`);
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    if (res.status === 403) {
      setRows([]);
      return;
    }
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotal(typeof data.total === "number" ? data.total : null);
  }, [type, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["sales", "orders", "products", "customers"] as const).map((t) => (
          <AdminButton
            key={t}
            variant={type === t ? "primary" : "outline"}
            onClick={() => setType(t)}
          >
            {t}
          </AdminButton>
        ))}
        <AdminButton
          variant="outline"
          onClick={() => exportToCsv(`seller-report-${type}.csv`, rows as Record<string, string | number | boolean | null | undefined>[])}
        >
          خروجی CSV
        </AdminButton>
      </div>
      {total != null ? (
        <p className="text-sm text-stone-600">
          جمع: <span className="tabular-nums font-semibold">{total.toLocaleString("fa-IR")}</span>
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 text-stone-500">
              {rows[0]
                ? Object.keys(rows[0]).map((k) => (
                    <th key={k} className="px-3 py-2 text-start font-medium">
                      {k}
                    </th>
                  ))
                : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-stone-50">
                {Object.values(r).map((v, j) => (
                  <td key={j} className="px-3 py-2 tabular-nums">
                    {String(v ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-center text-stone-500">داده‌ای نیست</p>
        ) : null}
      </div>
    </div>
  );
}

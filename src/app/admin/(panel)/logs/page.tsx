"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { exportToCsv, exportToExcel } from "@/lib/admin/export";
import { AdminButton } from "@/components/admin/ui/AdminButton";

type LogRow = {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  adminUserId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

export default function AdminLogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/logs", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setRows(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DataTable
      columns={[
        { key: "action", header: "عملیات", render: (r) => r.action },
        {
          key: "entity",
          header: "موجودیت",
          hideOnMobile: true,
          render: (r) =>
            r.entityType ? `${r.entityType}:${r.entityId ?? ""}` : "—",
        },
        {
          key: "user",
          header: "کاربر",
          hideOnMobile: true,
          render: (r) => r.adminUserId || "—",
        },
        {
          key: "ip",
          header: "IP",
          hideOnMobile: true,
          render: (r) => (
            <span dir="ltr" className="tabular-nums">
              {r.ipAddress || "—"}
            </span>
          ),
        },
        {
          key: "createdAt",
          header: "زمان",
          render: (r) => (
            <span className="tabular-nums text-xs">
              {new Date(r.createdAt).toLocaleString("fa-IR")}
            </span>
          ),
        },
      ]}
      data={rows}
      rowKey={(r) => r.id}
      loading={loading}
      error={error}
      onRetry={load}
      searchable
      searchKeys={(r) =>
        `${r.action} ${r.entityType ?? ""} ${r.entityId ?? ""} ${r.ipAddress ?? ""}`
      }
      toolbar={
        <div className="flex gap-2">
          <AdminButton
            variant="outline"
            onClick={() =>
              exportToCsv(
                "system-logs",
                rows.map((r) => ({
                  action: r.action,
                  entity: r.entityType ?? "",
                  entityId: r.entityId ?? "",
                  user: r.adminUserId ?? "",
                  ip: r.ipAddress ?? "",
                  at: r.createdAt,
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
                "system-logs",
                rows.map((r) => ({
                  action: r.action,
                  entity: r.entityType ?? "",
                  entityId: r.entityId ?? "",
                  user: r.adminUserId ?? "",
                  ip: r.ipAddress ?? "",
                  at: r.createdAt,
                })),
              )
            }
          >
            Excel
          </AdminButton>
        </div>
      }
      emptyMessage="لاگی ثبت نشده"
    />
  );
}

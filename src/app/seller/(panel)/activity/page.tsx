"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";

type Row = {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  createdAt: string;
};

export default function SellerActivityPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/seller/activity?limit=${limit}&offset=${offset}`,
      );
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [offset, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">
        تاریخچه فعالیت‌های انجام‌شده در پنل شما
      </p>
      <SellerDataTable
        storageKey="seller.activity.grid"
        columns={[
          {
            key: "createdAt",
            header: "زمان",
            render: (r) =>
              new Date(r.createdAt).toLocaleString("fa-IR"),
          },
          { key: "action", header: "اقدام", render: (r) => r.action },
          {
            key: "entity",
            header: "موجودیت",
            render: (r) =>
              r.entityType
                ? `${r.entityType}${r.entityId ? `: ${r.entityId}` : ""}`
                : "—",
          },
          { key: "ip", header: "IP", render: (r) => r.ip ?? "—" },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="هنوز فعالیتی ثبت نشده"
        serverPagination={{
          page: Math.floor(offset / limit) + 1,
          pageSize: limit,
          total,
          onPageChange: (p) => setOffset((p - 1) * limit),
        }}
      />
      <AdminButton variant="outline" onClick={() => void load()}>
        بروزرسانی
      </AdminButton>
    </div>
  );
}

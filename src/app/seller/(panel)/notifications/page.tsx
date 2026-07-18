"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";

type Notif = {
  id: string;
  title: string;
  body?: string;
  readAt?: string;
  createdAt: string;
  href?: string;
};

export default function SellerNotificationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Notif[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/notifications");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const mark = async (all?: boolean) => {
    await fetch("/api/seller/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(all ? { all: true } : { ids: selected }),
    });
    setSelected([]);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="outline" onClick={() => void mark(false)} disabled={!selected.length}>
          خواندن انتخاب‌شده
        </AdminButton>
        <AdminButton variant="outline" onClick={() => void mark(true)}>
          همه خوانده شد
        </AdminButton>
      </div>
      <SellerDataTable
        storageKey="seller.notifications.grid"
        loading={loading}
        selectable
        selectedKeys={selected}
        onSelectionChange={setSelected}
        columns={[
          {
            key: "title",
            header: "عنوان",
            render: (r) => (
              <span className={!r.readAt ? "font-semibold" : ""}>{r.title}</span>
            ),
          },
          { key: "body", header: "متن", render: (r) => r.body ?? "—" },
          {
            key: "date",
            header: "زمان",
            render: (r) => new Date(r.createdAt).toLocaleString("fa-IR"),
          },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        emptyMessage="اعلانی نیست"
      />
    </div>
  );
}

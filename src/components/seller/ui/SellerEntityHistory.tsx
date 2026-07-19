"use client";

import { useEffect, useState } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";

type ActivityRow = {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
  ip?: string;
};

export function SellerEntityHistory({
  entityType,
  entityId,
  open,
  onClose,
}: {
  entityType: string;
  entityId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/activity?limit=100");
        if (!res.ok) return;
        const data = (await res.json()) as { rows?: ActivityRow[] };
        setRows(
          (data.rows ?? []).filter(
            (r) => r.entityType === entityType && r.entityId === entityId,
          ),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, entityType, entityId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-stone-900/30" dir="rtl">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="بستن"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-s border-stone-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="font-semibold text-stone-900">تاریخچه فعالیت</h3>
          <AdminButton size="sm" variant="ghost" onClick={onClose}>
            بستن
          </AdminButton>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-stone-500">در حال بارگذاری...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-stone-500">رویدادی برای این مورد نیست</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{r.action}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {new Date(r.createdAt).toLocaleString("fa-IR")}
                    {r.ip ? ` · ${r.ip}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

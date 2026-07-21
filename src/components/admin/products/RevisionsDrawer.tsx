"use client";

import { useEffect, useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { ProductRevision } from "@/types";

export function RevisionsDrawer({
  productId,
  open,
  onClose,
  onRestored,
}: {
  productId: string;
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}) {
  const [revisions, setRevisions] = useState<ProductRevision[]>([]);
  const [fetched, setFetched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loading = open && !fetched && !busy;

  useEffect(() => {
    if (!open || !productId) return;

    let cancelled = false;
    void fetch(`/api/admin/products/${productId}/revisions`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "خطا");
        if (!cancelled) {
          setRevisions(data.revisions ?? []);
          setFetched(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "خطای ناشناخته");
          setFetched(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, productId]);

  const restore = async (revisionId: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${productId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ revisionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      onRestored();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <button
        type="button"
        className="flex-1"
        aria-label="بستن"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Icon icon={ClockCounterClockwise} size={18} />
            <h2 className="text-sm font-semibold">تاریخچه نسخه‌ها</h2>
          </div>
          <AdminButton variant="ghost" size="sm" onClick={onClose}>
            بستن
          </AdminButton>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-stone-500">در حال بارگذاری...</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <ul className="space-y-2">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="rounded-xl border border-stone-200 p-3"
              >
                <p className="text-xs text-stone-500">
                  {new Date(rev.createdAt).toLocaleString("fa-IR")}
                </p>
                <p className="mt-1 text-sm font-medium text-stone-800">
                  {rev.note || "ویرایش"}
                </p>
                <p className="text-xs text-stone-500">
                  توسط: {rev.actor || "admin"}
                </p>
                <AdminButton
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => void restore(rev.id)}
                >
                  بازگردانی این نسخه
                </AdminButton>
              </li>
            ))}
            {!loading && revisions.length === 0 ? (
              <p className="text-sm text-stone-500">نسخه‌ای ثبت نشده است.</p>
            ) : null}
          </ul>
        </div>
      </aside>
    </div>
  );
}

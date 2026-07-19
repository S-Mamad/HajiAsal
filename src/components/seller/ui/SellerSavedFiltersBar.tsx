"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";

type SavedFilter = {
  id: string;
  name: string;
  payload: Record<string, unknown>;
};

export function SellerSavedFiltersBar({
  moduleKey,
  currentPayload,
  onApply,
}: {
  moduleKey: string;
  currentPayload: Record<string, unknown>;
  onApply: (payload: Record<string, unknown>) => void;
}) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/seller/saved-filters?module=${encodeURIComponent(moduleKey)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { filters?: SavedFilter[] };
      setFilters(data.filters ?? []);
    } catch {
      /* ignore */
    }
  }, [moduleKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/seller/saved-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleKey,
          name: name.trim(),
          payload: currentPayload,
        }),
      });
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch("/api/seller/saved-filters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
      <span className="text-xs font-medium text-stone-500">فیلتر ذخیره‌شده:</span>
      {filters.length === 0 ? (
        <span className="text-xs text-stone-400">هنوز چیزی ذخیره نشده</span>
      ) : (
        filters.map((f) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5"
          >
            <button
              type="button"
              className="hover:text-amber-900"
              onClick={() => onApply(f.payload)}
            >
              {f.name}
            </button>
            <button
              type="button"
              className="text-rose-600"
              aria-label="حذف فیلتر"
              onClick={() => void remove(f.id)}
            >
              ×
            </button>
          </span>
        ))
      )}
      <input
        className="ms-auto min-w-[120px] rounded-md border border-stone-200 px-2 py-1 text-xs"
        placeholder="نام فیلتر جدید"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <AdminButton
        size="sm"
        variant="outline"
        disabled={busy || !name.trim()}
        onClick={() => void save()}
      >
        ذخیره فیلتر فعلی
      </AdminButton>
    </div>
  );
}

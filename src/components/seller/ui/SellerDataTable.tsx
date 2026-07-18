"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
} from "@/components/admin/ui/DataTable";
import { cn } from "@/lib/utils";

export type { DataTableColumn };

type SellerDataTableProps<T> = DataTableProps<T> & {
  storageKey: string;
  pageSizeOptions?: number[];
};

type PersistedGrid = {
  pageSize?: number;
  hidden?: Record<string, boolean>;
};

function readPersisted(key: string): PersistedGrid {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedGrid;
  } catch {
    return {};
  }
}

function writePersisted(key: string, value: PersistedGrid) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function SellerDataTable<T>({
  storageKey,
  columns,
  pageSize: pageSizeProp = 25,
  pageSizeOptions = [10, 25, 50, 100],
  toolbar,
  ...rest
}: SellerDataTableProps<T>) {
  const [pageSize, setPageSize] = useState(pageSizeProp);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readPersisted(storageKey);
    if (saved.pageSize && pageSizeOptions.includes(saved.pageSize)) {
      setPageSize(saved.pageSize);
    }
    if (saved.hidden) setHidden(saved.hidden);
    setReady(true);
  }, [storageKey, pageSizeOptions]);

  useEffect(() => {
    if (!ready) return;
    writePersisted(storageKey, { pageSize, hidden });
  }, [storageKey, pageSize, hidden, ready]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hidden[c.key]),
    [columns, hidden],
  );

  const columnToggle = (
    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
      <label className="flex items-center gap-1.5">
        <span>ردیف</span>
        <select
          className="rounded-md border border-stone-200 bg-white px-2 py-1"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-stone-200 bg-white px-2 py-1 hover:bg-stone-50">
          ستون‌ها
        </summary>
        <div className="absolute end-0 z-20 mt-1 w-48 rounded-lg border border-stone-200 bg-white p-2 shadow-lg">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-1 py-1.5 text-stone-700"
            >
              <input
                type="checkbox"
                checked={!hidden[col.key]}
                onChange={() =>
                  setHidden((prev) => ({
                    ...prev,
                    [col.key]: !prev[col.key],
                  }))
                }
              />
              {col.header}
            </label>
          ))}
        </div>
      </details>
    </div>
  );

  const mergedToolbar = (
    <div className={cn("flex flex-wrap items-center gap-3")}>
      {columnToggle}
      {toolbar}
    </div>
  );

  return (
    <DataTable
      {...rest}
      columns={visibleColumns.length ? visibleColumns : columns}
      pageSize={pageSize}
      toolbar={mergedToolbar}
    />
  );
}

export function SellerEmpty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white/70 px-6 py-16 text-center">
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-stone-500">{description}</p>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

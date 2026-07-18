"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CaretDown,
  CaretUp,
  CaretUpDown,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  minWidth?: number | false;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (row: T) => string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  bulkActions?: ReactNode;
  toolbar?: ReactNode;
  pageSize?: number;
  serverPagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "داده‌ای یافت نشد",
  className,
  minWidth = 640,
  loading = false,
  error = null,
  onRetry,
  searchable = false,
  searchPlaceholder = "جستجو...",
  searchKeys,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  bulkActions,
  toolbar,
  pageSize = 20,
  serverPagination,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const visibleColumns = columns.filter((c) => !hidden[c.key]);

  const filtered = useMemo(() => {
    let rows = data;
    if (searchable && query.trim() && searchKeys) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((row) => searchKeys(row).toLowerCase().includes(q));
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        rows = [...rows].sort((a, b) => {
          const av = String(searchKeys ? searchKeys(a) : rowKey(a));
          const bv = String(searchKeys ? searchKeys(b) : rowKey(b));
          const cmp = av.localeCompare(bv, "fa");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [data, query, searchable, searchKeys, sort, columns, rowKey]);

  const total = serverPagination?.total ?? filtered.length;
  const currentPage = serverPagination?.page ?? page;
  const size = serverPagination?.pageSize ?? pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));

  const pageRows = serverPagination
    ? filtered
    : filtered.slice((currentPage - 1) * size, currentPage * size);

  const allKeys = pageRows.map(rowKey);
  const allSelected =
    selectable && allKeys.length > 0 && allKeys.every((k) => selectedKeys.includes(k));

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedKeys.filter((k) => !allKeys.includes(k)));
    } else {
      onSelectionChange([...new Set([...selectedKeys, ...allKeys])]);
    }
  };

  const toggleOne = (key: string) => {
    if (!onSelectionChange) return;
    if (selectedKeys.includes(key)) {
      onSelectionChange(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedKeys, key]);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm",
          className,
        )}
        aria-busy
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse border-t border-stone-100 bg-stone-50/70 first:border-0"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center">
        <p className="text-sm text-red-700">{error}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-sm text-white"
          >
            تلاش مجدد
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {searchable ? (
            <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl border border-stone-200 bg-white pe-3 ps-9 text-sm outline-none focus:border-amber-700/40 focus:ring-2 focus:ring-amber-700/10"
              />
            </label>
          ) : null}
          {toolbar}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectable && selectedKeys.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">
                {selectedKeys.length} انتخاب‌شده
              </span>
              {bulkActions}
            </div>
          ) : null}
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 hover:bg-stone-50">
              ستون‌ها
            </summary>
            <div className="absolute end-0 z-20 mt-1 w-48 rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-stone-50"
                >
                  <input
                    type="checkbox"
                    checked={!hidden[col.key]}
                    onChange={() =>
                      setHidden((h) => ({ ...h, [col.key]: !h[col.key] }))
                    }
                  />
                  {col.header}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-stone-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
        <table
          className="w-full text-sm"
          style={
            minWidth === false
              ? undefined
              : { minWidth: typeof minWidth === "number" ? minWidth : 640 }
          }
        >
          <thead className="sticky top-0 z-[1] bg-stone-50/95 text-start text-stone-500 backdrop-blur">
            <tr>
              {selectable ? (
                <th className="w-10 px-3 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="انتخاب همه"
                  />
                </th>
              ) : null}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-3.5 font-medium sm:px-4",
                    col.hideOnMobile && "hidden md:table-cell",
                    col.className,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-stone-800"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <CaretUp size={12} />
                        ) : (
                          <CaretDown size={12} />
                        )
                      ) : (
                        <CaretUpDown size={12} className="opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (selectable ? 1 : 0)}
                  className="px-4 py-14 text-center text-stone-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    className="border-t border-stone-100 transition-colors hover:bg-amber-50/40"
                  >
                    {selectable ? (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedKeys.includes(key)}
                          onChange={() => toggleOne(key)}
                          aria-label="انتخاب ردیف"
                        />
                      </td>
                    ) : null}
                    {visibleColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-3 sm:px-4",
                          col.hideOnMobile && "hidden md:table-cell",
                          col.className,
                        )}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
        <span>
          {total} مورد · صفحه {currentPage} از {pageCount}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(currentPage - 1)
                : setPage((p) => Math.max(1, p - 1))
            }
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            قبلی
          </button>
          <button
            type="button"
            disabled={currentPage >= pageCount}
            onClick={() =>
              serverPagination
                ? serverPagination.onPageChange(currentPage + 1)
                : setPage((p) => Math.min(pageCount, p + 1))
            }
            className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 disabled:opacity-40"
          >
            بعدی
          </button>
        </div>
      </div>
    </div>
  );
}

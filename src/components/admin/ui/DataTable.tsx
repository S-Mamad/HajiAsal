import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  /** Hide this column below md breakpoint */
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  /** Table min-width. Pass false for auto (no forced scroll). Default 640. */
  minWidth?: number | false;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "داده‌ای یافت نشد",
  className,
  minWidth = 640,
  loading = false,
}: DataTableProps<T> & { loading?: boolean }) {
  if (loading) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
          className,
        )}
        aria-busy
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse border-t border-slate-100 bg-slate-50/70 first:border-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <table
        className="w-full text-sm"
        style={
          minWidth === false
            ? undefined
            : { minWidth: typeof minWidth === "number" ? minWidth : 640 }
        }
      >
        <thead className="sticky top-0 z-[1] bg-slate-50/95 text-start text-slate-500 backdrop-blur">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "whitespace-nowrap px-3 py-3.5 font-medium sm:px-4",
                  col.hideOnMobile && "hidden md:table-cell",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-14 text-center text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-t border-slate-100 transition-colors hover:bg-slate-50/80"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-3.5 text-slate-700 sm:px-4",
                      col.hideOnMobile && "hidden md:table-cell",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

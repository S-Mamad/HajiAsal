"use client";

import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

function pageItems(page: number, total: number): Array<number | "…"> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const items: Array<number | "…"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);

  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = pageItems(page, totalPages);

  return (
    <nav
      className={cn(
        "mt-10 flex items-center justify-center gap-1 md:mt-14",
        className,
      )}
      aria-label="صفحه‌بندی محصولات"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="flex h-9 w-9 items-center justify-center text-secondary transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-25"
        aria-label="صفحه قبل"
      >
        <CaretRight size={16} weight="bold" />
      </button>

      {items.map((item, i) =>
        item === "…" ? (
          <span
            key={`e-${i}`}
            className="flex h-9 w-7 items-center justify-center text-xs text-dim"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center px-2 text-sm tabular-nums transition-colors",
              item === page
                ? "border-b border-gold text-gold"
                : "text-secondary hover:text-primary",
            )}
          >
            {item.toLocaleString("fa-IR")}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="flex h-9 w-9 items-center justify-center text-secondary transition-colors hover:text-gold disabled:pointer-events-none disabled:opacity-25"
        aria-label="صفحه بعد"
      >
        <CaretLeft size={16} weight="bold" />
      </button>
    </nav>
  );
}

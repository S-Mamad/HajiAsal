"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ProductAccordionProps } from "../types";

export function ProductAccordion({
  items,
  title,
  ariaLabel,
  className,
}: ProductAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const label = ariaLabel ?? (title || "جزئیات");

  if (items.length === 0) return null;

  return (
    <section aria-label={label} className={cn(className)}>
      {title ? (
        <h2 className="mb-4 font-display text-2xl text-primary">{title}</h2>
      ) : null}
      <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.title}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between px-5 py-4 text-start"
              >
                <span className="text-sm font-medium text-primary">
                  {item.title}
                </span>
                <CaretDown
                  size={18}
                  className={cn(
                    "text-gold transition-transform duration-300",
                    open && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  open
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-4 text-sm leading-relaxed text-secondary">
                    {item.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

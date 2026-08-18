"use client";

import { useState, type ReactNode } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function AdminAccordion({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="panel-card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition hover:bg-zinc-50"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-900">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
              {description}
            </span>
          ) : null}
        </span>
        <CaretDown
          size={16}
          className={cn(
            "shrink-0 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-zinc-200 px-5 py-5">{children}</div>
      ) : null}
    </section>
  );
}

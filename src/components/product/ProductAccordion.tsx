"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface AccordionItem {
  title: string;
  content: string;
}

interface ProductAccordionProps {
  items: AccordionItem[];
}

export function ProductAccordion({ items }: ProductAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
      {items.map((item, i) => (
        <div key={item.title}>
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between px-5 py-4 text-start"
          >
            <span className="text-sm font-medium text-primary">{item.title}</span>
            <CaretDown
              size={18}
              className={cn(
                "text-gold transition-transform duration-300",
                openIndex === i && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              openIndex === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <p className="px-5 pb-4 text-sm leading-relaxed text-secondary">
                {item.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

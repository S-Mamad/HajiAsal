"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyHint?: string;
  error?: string;
  placeholder?: string;
};

export function LocationChipPicker({
  label,
  options,
  value,
  onChange,
  disabled,
  searchPlaceholder = "جستجو",
  emptyHint = "موردی پیدا نشد",
  error,
  placeholder = "انتخاب کنید",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return options.filter((item) => item.includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setQuery("");
    }
  }, [disabled]);

  return (
    <div ref={rootRef} className={cn("min-w-0", disabled && "opacity-50")}>
      <p className="mb-1.5 text-[13px] font-medium text-secondary">{label}</p>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 text-start text-[13.5px] transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/35",
          error ? "border-red-400" : "border-border",
          open && !error && "border-gold/45",
          !disabled && "hover:border-gold/35",
        )}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
          setQuery("");
        }}
      >
        <span className={cn("truncate", value ? "text-primary" : "text-dim")}>
          {value || placeholder}
        </span>
        <Icon
          icon={CaretDown}
          size={14}
          className={cn(
            "shrink-0 text-dim transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-white shadow-[0_12px_32px_-18px_rgb(28_25_23/0.45)]">
          <div className="relative border-b border-border/70">
            <Icon
              icon={MagnifyingGlass}
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dim"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent py-0 pr-9 pl-3 text-[13px] text-primary outline-none placeholder:text-dim"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-48 overflow-y-auto py-1"
          >
            {filtered.map((item) => {
              const selected = item === value;
              return (
                <li key={item}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-[13.5px] transition",
                      selected
                        ? "bg-gold-dim font-medium text-gold"
                        : "text-primary hover:bg-surface-muted",
                    )}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="truncate">{item}</span>
                    {selected ? (
                      <Icon icon={Check} size={14} weight="bold" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-secondary">{emptyHint}</p>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="mt-1 text-[12px] text-red-500">{error}</p> : null}
    </div>
  );
}

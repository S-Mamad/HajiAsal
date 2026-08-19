"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveSearchUi } from "@/lib/search-ui";
import { pushSearchRecent, readSearchRecent } from "@/lib/search-recent";
import { cn } from "@/lib/utils";

interface ShopSearchFieldProps {
  value?: string;
  onSearch: (term: string) => void;
  onClear?: () => void;
  className?: string;
}

const RECENT_ROW_MAX = 4;

export function ShopSearchField({
  value = "",
  onSearch,
  onClear,
  className,
}: ShopSearchFieldProps) {
  const site = useSiteSettings();
  const searchUi = resolveSearchUi(site);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const committed = value.trim();
  const [draft, setDraft] = useState(committed);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setDraft(committed);
  }, [committed]);

  useEffect(() => {
    if (!focused) return;
    setRecent(readSearchRecent());
  }, [focused]);

  const recentRow = recent.slice(0, RECENT_ROW_MAX);
  const showRecent = focused && !draft.trim() && recentRow.length > 0;

  const pickTerm = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      pushSearchRecent(t);
      setDraft(t);
      setFocused(false);
      inputRef.current?.blur();
      onSearch(t);
    },
    [onSearch],
  );

  const submit = useCallback(
    (raw: string) => {
      const t = raw.trim();
      setFocused(false);
      inputRef.current?.blur();
      if (t) {
        pushSearchRecent(t);
        onSearch(t);
      } else {
        onClear?.();
        onSearch("");
      }
    },
    [onClear, onSearch],
  );

  useEffect(() => {
    if (!focused) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [focused]);

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-xl border bg-surface-elevated px-3 py-2 transition-[border-color,box-shadow] duration-200",
          focused
            ? "border-gold/35 shadow-[0_0_0_3px_rgb(161_98_7/0.08)]"
            : "border-border hover:border-gold/25",
        )}
      >
        <Icon
          icon={MagnifyingGlass}
          size={18}
          className="shrink-0 text-gold"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={searchUi.placeholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] leading-normal text-primary outline-none placeholder:text-dim [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
          autoComplete="off"
          enterKeyHint="search"
          aria-controls={showRecent ? listId : undefined}
          aria-expanded={showRecent}
          aria-label="جستجوی محصولات"
        />
        {draft.trim() ? (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              onClear?.();
              onSearch("");
              inputRef.current?.focus();
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-secondary transition hover:bg-surface-muted hover:text-primary active:scale-95"
            aria-label="پاک کردن جستجو"
          >
            <X size={14} weight="bold" aria-hidden />
          </button>
        ) : null}
      </form>

      {showRecent ? (
        <div
          id={listId}
          className="mt-2 flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <span className="shrink-0 text-[11px] text-dim">اخیر</span>
          {recentRow.map((term) => (
            <button
              key={term}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pickTerm(term)}
              className="shrink-0 rounded-full bg-surface-muted/90 px-2.5 py-1 text-[12px] text-secondary transition hover:bg-gold-dim hover:text-primary active:scale-[0.98]"
            >
              {term}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  MagnifyingGlass,
  X,
  ArrowLeft,
  Sparkle,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import type { Product } from "@/types";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatPrice, cn } from "@/lib/utils";
import { getMinPrice } from "@/lib/products";
import { hajiasalPath } from "@/lib/paths";
import { catalogImageFit, catalogMediaClass, imageFitForSrc } from "@/lib/product-image";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolveSearchUi } from "@/lib/search-ui";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const RECENT_KEY = "hajiasal.search.recent";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const t = term.trim();
  if (!t) return;
  try {
    const next = [t, ...readRecent().filter((x) => x !== t)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const site = useSiteSettings();
  const searchUi = resolveSearchUi(site);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(open);

  const search = useCallback(async (q: string, signal?: AbortSignal) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setResultTotal(0);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}&limit=16`,
        { cache: "no-store", signal },
      );
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      if (signal?.aborted) return;
      setResults(Array.isArray(data.results) ? data.results : []);
      setResultTotal(
        typeof data.total === "number" ? data.total : data.results?.length ?? 0,
      );
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof Error && err.name === "AbortError") return;
      setResults([]);
      setError("جستجو انجام نشد. دوباره تلاش کنید.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => void search(query, controller.signal),
      220,
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, search, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setLoading(false);
    onClose();
  };

  const applyTerm = (term: string) => {
    setQuery(term);
    pushRecent(term);
    setRecent(readRecent());
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const trimmed = query.trim();
  const showIdle = !trimmed;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] overlay-scrim"
            onClick={handleClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="جستجوی محصولات"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 top-0 z-[130] flex max-h-[100dvh] flex-col overflow-hidden bg-surface sm:inset-x-4 sm:top-[4.75rem] sm:mx-auto sm:max-h-[min(82dvh,40rem)] sm:max-w-2xl sm:rounded-[1.35rem] sm:border sm:border-border-bright sm:shadow-2xl"
          >
            <div className="shrink-0 border-b border-border/80 bg-surface/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4 sm:pt-4">
              <div className="flex items-center gap-2 rounded-[1.15rem] border border-border bg-surface-elevated px-3 py-2 shadow-[0_8px_24px_-18px_var(--gold-glow)] focus-within:border-gold/35 focus-within:ring-2 focus-within:ring-gold/20">
                <Icon
                  icon={MagnifyingGlass}
                  size={20}
                  className="shrink-0 text-gold"
                />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && trimmed) {
                      pushRecent(trimmed);
                      setRecent(readRecent());
                    }
                  }}
                  placeholder={searchUi.placeholder}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none placeholder:text-dim"
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-autocomplete="list"
                />
                {trimmed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setError(null);
                      inputRef.current?.focus();
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-secondary transition hover:bg-surface-muted hover:text-primary active:scale-[0.96]"
                    aria-label="پاک کردن"
                  >
                    <Icon icon={X} size={16} />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-9 shrink-0 items-center justify-center rounded-xl px-2.5 text-sm font-medium text-secondary transition hover:bg-surface-muted hover:text-primary active:scale-[0.97]"
                >
                  بستن
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-3">
              {showIdle ? (
                <div className="space-y-5 px-2 py-4 sm:px-3">
                  {recent.length > 0 ? (
                    <section>
                      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                        <Icon icon={ClockCounterClockwise} size={14} />
                        جستجوهای اخیر
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recent.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => applyTerm(s)}
                            className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs text-primary transition hover:border-gold/35 hover:bg-gold-dim active:scale-[0.98]"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {searchUi.suggestions.length > 0 ? (
                  <section>
                    <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-secondary">
                      <Icon icon={Sparkle} size={14} className="text-gold" />
                      {searchUi.suggestionsTitle}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {searchUi.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => applyTerm(s)}
                          className="rounded-full border border-border-bright bg-surface-elevated px-3.5 py-2 text-xs text-secondary transition hover:border-gold/40 hover:text-gold active:scale-[0.98]"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </section>
                  ) : null}

                  {searchUi.hint ? (
                  <p className="pt-1 text-center text-[12px] leading-relaxed text-dim">
                    {searchUi.hint}
                  </p>
                  ) : null}
                </div>
              ) : loading ? (
                <ul className="flex flex-col gap-2 py-3" aria-busy>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="flex animate-pulse items-center gap-3 rounded-2xl p-2.5"
                    >
                      <div className="h-14 w-14 rounded-xl bg-surface-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3 w-2/3 rounded bg-surface-muted" />
                        <div className="h-3 w-1/3 rounded bg-surface-muted" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : error ? (
                <ErrorState
                  className="my-4 border-0 bg-transparent dark:bg-transparent"
                  title="جستجو انجام نشد"
                  description={error}
                  onRetry={() => void search(query)}
                />
              ) : results.length > 0 ? (
                <>
                  <p className="px-3 pt-3 text-[11px] text-secondary">
                    {resultTotal.toLocaleString("fa-IR")} نتیجه
                    {trimmed.length > 0 ? ` برای «${trimmed}»` : ""}
                    {resultTotal > results.length
                      ? ` (نمایش ${results.length.toLocaleString("fa-IR")})`
                      : ""}
                  </p>
                  <ul className="flex flex-col gap-0.5 py-2">
                    {results.map((product) => {
                      const thumbSrc = product.images[0] ?? "";
                      const thumbFit = imageFitForSrc(
                        product.imageFits,
                        thumbSrc,
                      );
                      return (
                        <li key={product.id}>
                          <Link
                            href={hajiasalPath(`/product/${product.slug}`)}
                            onClick={() => {
                              pushRecent(trimmed);
                              handleClose();
                            }}
                            className={cn(
                              "flex items-center gap-3 rounded-2xl p-2.5 transition-colors",
                              "hover:bg-surface-muted active:bg-surface-elevated",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                            )}
                          >
                            <div
                              className={cn(
                                catalogMediaClass(thumbSrc, thumbFit),
                                "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-border/60",
                              )}
                            >
                              <ProductImage
                                src={thumbSrc}
                                alt={product.title}
                                fill
                                fit={catalogImageFit(thumbSrc, thumbFit)}
                                imageFit={thumbFit}
                                sizes="56px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-primary">
                                {product.title}
                              </p>
                              <p className="mt-0.5 text-xs text-secondary">
                                {product.categoryLabel}
                                <span className="mx-1.5 text-dim">·</span>
                                <span className="font-medium text-gold tabular-nums">
                                  {formatPrice(getMinPrice(product))}
                                </span>
                              </p>
                            </div>
                            <Icon
                              icon={ArrowLeft}
                              size={16}
                              className="shrink-0 text-dim"
                            />
                          </Link>
                        </li>
                      );
                    })}
                      </ul>
                  <div className="border-t border-border px-3 py-3">
                    <Link
                      href={hajiasalPath(
                        `/shop?q=${encodeURIComponent(trimmed)}`,
                      )}
                      onClick={() => {
                        pushRecent(trimmed);
                        handleClose();
                      }}
                      className="block rounded-2xl bg-gold py-3 text-center text-sm font-semibold text-primary transition hover:brightness-95 active:scale-[0.99]"
                    >
                      مشاهده همه در فروشگاه
                    </Link>
                  </div>
                </>
              ) : (
                <EmptyState
                  className="my-4 border-0 bg-transparent"
                  title="نتیجه‌ای یافت نشد"
                  description={
                    searchUi.suggestions.length > 0
                      ? `برای «${trimmed}» محصولی پیدا نشد. پیشنهادها را امتحان کنید.`
                      : `برای «${trimmed}» محصولی پیدا نشد.`
                  }
                  action={
                    searchUi.suggestions.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      {searchUi.suggestions.slice(0, 3).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => applyTerm(s)}
                          className="rounded-full border border-border px-3 py-1.5 text-xs text-secondary hover:border-gold/40 hover:text-gold"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    ) : undefined
                  }
                />
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

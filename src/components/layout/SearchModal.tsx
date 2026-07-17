"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { MagnifyingGlass, X, ArrowLeft, Package } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatPrice } from "@/lib/utils";
import { getMinPrice } from "@/lib/products";
import { hajiasalPath } from "@/lib/paths";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = ["عسل کوهستان", "آویشن", "ژل رویال", "ست هدیه", "شهد"];

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(open);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(trimmed)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setResults([]);
      setError("جستجو انجام نشد. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => search(query), 280);
    return () => window.clearTimeout(timer);
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
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] overlay-scrim backdrop-blur-md"
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
            className="fixed inset-x-0 top-0 z-[90] flex max-h-[100dvh] flex-col bg-surface sm:inset-x-4 sm:top-16 sm:mx-auto sm:max-h-[min(80dvh,36rem)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-border-bright sm:shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
              <MagnifyingGlass size={20} className="shrink-0 text-gold" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی عسل، ژل رویال، هدیه..."
                className="min-w-0 flex-1 bg-transparent text-base text-primary outline-none placeholder:text-dim"
                autoComplete="off"
                enterKeyHint="search"
              />
              <button
                type="button"
                onClick={handleClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-secondary hover:bg-surface-muted hover:text-gold"
                aria-label="بستن"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-3">
              {query.trim().length < 2 ? (
                <div className="px-3 py-5">
                  <p className="mb-3 text-xs font-medium text-dim">پیشنهادها</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQuery(s)}
                        className="rounded-full border border-border-bright bg-surface-elevated px-3 py-1.5 text-xs text-secondary transition-colors hover:border-gold/40 hover:text-gold"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="mt-6 flex items-center justify-center gap-2 text-sm text-dim">
                    <Package size={16} />
                    حداقل ۲ حرف تایپ کنید
                  </p>
                </div>
              ) : loading ? (
                <p className="py-12 text-center text-sm text-secondary">
                  در حال جستجو...
                </p>
              ) : error ? (
                <p className="py-12 text-center text-sm text-red-400">{error}</p>
              ) : results.length > 0 ? (
                <ul className="flex flex-col gap-0.5 py-2">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={hajiasalPath(`/product/${product.slug}`)}
                        onClick={handleClose}
                        className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-muted active:bg-surface-elevated"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                          <ProductImage
                            src={product.images[0]}
                            alt={product.title}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-primary">
                            {product.title}
                          </p>
                          <p className="mt-0.5 text-xs text-secondary">
                            {product.categoryLabel}
                            <span className="mx-1.5 text-dim">·</span>
                            <span className="text-gold tabular-nums">
                              {formatPrice(getMinPrice(product))}
                            </span>
                          </p>
                        </div>
                        <ArrowLeft size={16} className="shrink-0 text-dim" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-12 text-center text-sm text-secondary">
                  نتیجه‌ای برای «{query.trim()}» یافت نشد
                </p>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

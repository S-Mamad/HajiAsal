"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, SpinnerGap, X } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type SearchHit = {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/seller/search?q=${encodeURIComponent(query.trim())}`,
          );
          const data = (await res.json()) as { results?: SearchHit[] };
          setResults(data.results ?? []);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  if (!open) return null;

  const groups = ["product", "order", "ticket"] as const;
  const labels: Record<string, string> = {
    product: "محصولات",
    order: "سفارشات",
    ticket: "تیکت‌ها",
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-zinc-950/50 p-4 pt-[12vh] backdrop-blur-[1px]" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="بستن"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[12px] border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3">
          <Icon icon={MagnifyingGlass} size={18} className="text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در پنل فروشنده..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          {loading ? (
            <Icon icon={SpinnerGap} size={18} className="animate-spin text-amber-700" />
          ) : (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100"
              aria-label="بستن"
            >
              <Icon icon={X} size={16} />
            </button>
          )}
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              حداقل ۲ کاراکتر وارد کنید
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              چیزی پیدا نشد
            </p>
          ) : (
            groups.map((type) => {
              const items = results.filter((r) => r.type === type);
              if (!items.length) return null;
              return (
                <div key={type} className="mb-2">
                  <p className="px-3 py-1 text-[11px] font-medium tracking-wide text-zinc-400">
                    {labels[type]}
                  </p>
                  <ul>
                    {items.map((item) => (
                      <li key={`${item.type}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => go(item.href)}
                          className={cn(
                            "flex w-full flex-col rounded-lg px-3 py-2 text-start transition hover:bg-zinc-50",
                          )}
                        >
                          <span className="text-sm font-medium text-zinc-900">
                            {item.title}
                          </span>
                          {item.subtitle ? (
                            <span className="text-xs text-zinc-500">
                              {item.subtitle}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

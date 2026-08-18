"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminInput } from "@/components/admin/ui/AdminForm";

type PickerProduct = { id: string; title: string };

export function CartPromoProductPicker({
  ids,
  onChange,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PickerProduct[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(
        `/api/products?q=${encodeURIComponent(q)}&limit=8&inStock=1`,
      )
        .then(async (res) => {
          if (!res.ok) return { products: [] as PickerProduct[] };
          return (await res.json()) as { products?: PickerProduct[] };
        })
        .then((data) => {
          const products = data.products ?? [];
          setHits(products);
          setTitles((prev) => {
            const next = { ...prev };
            for (const p of products) next[p.id] = p.title;
            return next;
          });
        })
        .catch(() => {
          setHits([]);
        });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter((id) => !titles[id]);
    if (missing.length === 0) return;
    void fetch(
      `/api/products?ids=${encodeURIComponent(missing.join(","))}`,
    )
      .then(async (res) => {
        if (!res.ok) return { products: [] as PickerProduct[] };
        return (await res.json()) as { products?: PickerProduct[] };
      })
      .then((data) => {
        setTitles((prev) => {
          const next = { ...prev };
          for (const p of data.products ?? []) next[p.id] = p.title;
          return next;
        });
      })
      .catch(() => {
        /* keep ids even if titles fail */
      });
    // titles intentionally omitted — only refetch when ids change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const selected = useMemo(
    () => ids.map((id) => ({ id, title: titles[id] ?? id })),
    [ids, titles],
  );

  const add = (product: PickerProduct) => {
    if (ids.includes(product.id) || ids.length >= 16) return;
    onChange([...ids, product.id]);
    setTitles((prev) => ({ ...prev, [product.id]: product.title }));
    setQuery("");
    setHits([]);
  };

  const remove = (id: string) => {
    onChange(ids.filter((item) => item !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ids];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const current = next[index]!;
    next[index] = next[target]!;
    next[target] = current;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <AdminInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جستجوی نام محصول برای افزودن"
      />
      {hits.length > 0 ? (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                disabled={ids.includes(hit.id)}
                onClick={() => add(hit)}
                className="flex w-full items-center justify-between px-3 py-2 text-start text-sm text-zinc-800 hover:bg-zinc-50 disabled:opacity-40"
              >
                <span className="min-w-0 truncate">{hit.title}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {ids.includes(hit.id) ? "انتخاب‌شده" : "افزودن"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected.length > 0 ? (
        <ul className="space-y-2">
          {selected.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-zinc-800">
                {item.title}
              </span>
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-zinc-800"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                بالا
              </button>
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-zinc-800"
                onClick={() => move(index, 1)}
                disabled={index === selected.length - 1}
              >
                پایین
              </button>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={() => remove(item.id)}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-500">
          هنوز محصولی انتخاب نشده. با جستجو اضافه کنید.
        </p>
      )}
    </div>
  );
}

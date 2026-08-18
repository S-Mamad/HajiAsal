"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product } from "@/types";
import { useWishlistStore } from "@/store/wishlist";
import { ProductGrid } from "@/components/product";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { hajiasalPath } from "@/lib/paths";

export default function WishlistPage() {
  const ids = useWishlistStore((s) => s.ids);
  const hasHydrated = useWishlistStore((s) => s._hasHydrated);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products", { signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { products?: Product[] };
      setCatalog(data.products ?? []);
    } catch (err) {
      if (
        signal?.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      setCatalog([]);
      setError(
        "بارگذاری علاقه‌مندی‌ها ناموفق بود. اتصال اینترنت را بررسی کنید.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const products = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [catalog, ids]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-10 md:px-8 md:py-16">
      <SectionHeading
        title="علاقه‌مندی‌ها"
        subtitle={
          !hasHydrated || loading
            ? "در حال بارگذاری..."
            : error
              ? "خطا در دریافت فهرست"
              : products.length > 0
                ? `${products.length.toLocaleString("fa-IR")} محصول ذخیره شده`
                : "لیست علاقه‌مندی‌های شما خالی است"
        }
        className="mb-8 shrink-0 md:mb-10"
      />

      {!hasHydrated || loading ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
          aria-busy="true"
          aria-label="در حال بارگذاری علاقه‌مندی‌ها"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-muted"
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          className="my-auto"
          title="بارگذاری ناموفق"
          description={error}
          onRetry={() => void load()}
        />
      ) : products.length > 0 ? (
        <ProductGrid products={products} className="pb-8 md:pb-12" />
      ) : ids.length > 0 ? (
        <EmptyState
          className="my-auto"
          title="محصولات ذخیره‌شده در دسترس نیستند"
          description="شناسه‌هایی در علاقه‌مندی دارید ولی در کاتالوگ فعلی پیدا نشدند. فروشگاه را تازه کنید یا دوباره ذخیره کنید."
          action={
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          }
        />
      ) : (
        <EmptyState
          className="my-auto"
          title="لیست علاقه‌مندی خالی است"
          description="محصولاتی که دوست دارید را با قلب ذخیره کنید تا بعداً راحت پیدا کنید."
          action={
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          }
        />
      )}
    </div>
  );
}

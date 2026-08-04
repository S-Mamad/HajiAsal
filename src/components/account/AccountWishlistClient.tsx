"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types";
import { useWishlistStore } from "@/store/wishlist";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { hajiasalPath } from "@/lib/paths";
import { formatPersianNumber } from "@/lib/utils";

export function AccountWishlistClient() {
  const ids = useWishlistStore((s) => s.ids);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const [productsRes, wishRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/account/wishlist"),
        ]);
        const productsData = await productsRes.json();
        if (wishRes.ok) {
          const wishData = (await wishRes.json()) as { productIds?: string[] };
          const remote = wishData.productIds ?? [];
          if (remote.length > 0) {
            const local = useWishlistStore.getState().ids;
            useWishlistStore.setState({
              ids: Array.from(new Set([...local, ...remote])),
            });
          }
        }
        if (!cancelled) setCatalog(productsData.products ?? []);
      } catch {
        if (!cancelled) {
          setCatalog([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ids.length === 0) return;
    void fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids, merge: true }),
    });
  }, [ids]);

  const products = useMemo(() => {
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [catalog, ids]);

  return (
    <div>
      <AccountPageHeader
        title="علاقه‌مندی‌ها"
        subtitle={
          loading
            ? "در حال بارگذاری لیست..."
            : products.length > 0
              ? `${formatPersianNumber(products.length)} محصول ذخیره‌شده برای خرید بعدی`
              : "محصولات مورد علاقه را با قلب ذخیره کنید تا بعداً سریع پیدا شوند."
        }
      />

      {loading ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4"
          aria-busy="true"
          aria-label="در حال بارگذاری"
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-muted"
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="rounded-2xl border border-red-200/80 bg-red-50/80 px-5 py-8 text-center dark:border-red-900/40 dark:bg-red-950/30"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">
            بارگذاری علاقه‌مندی‌ها ممکن نشد.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 text-sm underline underline-offset-2"
          >
            تلاش مجدد
          </button>
        </div>
      ) : products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState
          title="لیست علاقه‌مندی خالی است"
          description="در صفحه محصول روی قلب بزنید تا اینجا جمع شوند."
          action={
            <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
          }
        />
      )}
    </div>
  );
}

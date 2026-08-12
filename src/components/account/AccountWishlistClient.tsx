"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/types";
import { useWishlistStore } from "@/store/wishlist";
import { ProductGrid } from "@/components/product";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { hajiasalPath } from "@/lib/paths";
import { formatPersianNumber } from "@/lib/utils";

export function AccountWishlistClient() {
  const ids = useWishlistStore((s) => s.ids);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const readyToSync = useRef(false);
  const lastSynced = useRef<string>("");

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
        if (!cancelled) {
          setLoading(false);
          readyToSync.current = true;
          lastSynced.current = useWishlistStore.getState().ids.join(",");
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!readyToSync.current) return;
    const key = ids.join(",");
    if (key === lastSynced.current) return;
    lastSynced.current = key;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/account/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids, merge: false }),
        signal: controller.signal,
      }).catch(() => {
        /* ignore abort / network */
      });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
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
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="بارگذاری علاقه‌مندی‌ها ممکن نشد."
          onRetry={() => window.location.reload()}
        />
      ) : products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <EmptyState
          title="لیست علاقه‌مندی خالی است"
          description="در صفحه محصول روی قلب بزنید تا اینجا جمع شوند."
          action={
            <Button href={hajiasalPath("/shop")} size="sm">
              مشاهده فروشگاه
            </Button>
          }
        />
      )}
    </div>
  );
}

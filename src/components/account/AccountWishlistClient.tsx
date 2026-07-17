"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types";
import { useWishlistStore } from "@/store/wishlist";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

export function AccountWishlistClient() {
  const ids = useWishlistStore((s) => s.ids);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (!cancelled) setCatalog(data.products ?? []);
      } catch {
        if (!cancelled) setCatalog([]);
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

  const products = useMemo(
    () => catalog.filter((p) => ids.includes(p.id)),
    [catalog, ids],
  );

  return (
    <div>
      <SectionHeading
        title="علاقه‌مندی‌ها"
        subtitle={
          loading
            ? "در حال بارگذاری..."
            : products.length > 0
              ? `${products.length.toLocaleString("fa-IR")} محصول`
              : "لیست خالی است"
        }
        className="mb-8"
      />
      {loading ? (
        <p className="py-10 text-center text-sm text-secondary">
          در حال بارگذاری...
        </p>
      ) : products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="py-12 text-center">
          <Button href={hajiasalPath("/shop")}>رفتن به فروشگاه</Button>
        </div>
      )}
    </div>
  );
}

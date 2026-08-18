"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import { ProductImage } from "@/components/ui/ProductImage";
import { PriceText } from "@/components/ui/PriceText";
import { useCartStore } from "@/store/cart";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { hajiasalPath } from "@/lib/paths";
import { catalogImageFit, catalogMediaClass, imageFitForSrc } from "@/lib/product-image";
import { getEffectiveWeightPrice } from "@/lib/products";
import { pickImpulseProducts, resolveCartPromo } from "@/lib/cart-promo";
import type { Product } from "@/types";

export function CartImpulseBuys() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const settings = useSiteSettings();
  const promo = resolveCartPromo(settings);
  const [products, setProducts] = useState<Product[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const cartProductKey = items.map((i) => i.productId).join(",");
  const manualIdsKey = promo.impulseProductIds.join(",");

  useEffect(() => {
    if (!promo.impulseEnabled) {
      setProducts([]);
      return;
    }
    if (promo.impulseMode === "manual" && promo.impulseProductIds.length === 0) {
      setProducts([]);
      return;
    }

    let cancelled = false;
    const inCart = new Set(cartProductKey ? cartProductKey.split(",") : []);
    const url =
      promo.impulseMode === "manual"
        ? `/api/products?ids=${encodeURIComponent(promo.impulseProductIds.join(","))}&inStock=1`
        : `/api/products?limit=24&sort=popular&inStock=1`;

    void fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { products?: Product[] };
      })
      .then((data) => {
        if (cancelled || !data?.products) return;
        setProducts(
          pickImpulseProducts(data.products, {
            mode: promo.impulseMode,
            ids: promo.impulseProductIds,
            inCartIds: inCart,
            limit: promo.impulseLimit,
          }),
        );
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [
    cartProductKey,
    promo.impulseEnabled,
    promo.impulseLimit,
    promo.impulseMode,
    manualIdsKey,
  ]);

  if (!promo.impulseEnabled || products.length === 0) return null;

  return (
    <section
      className="mt-6 min-w-0 max-w-full"
      aria-label={promo.impulseTitle}
    >
      <h2 className="mb-3 text-sm font-semibold text-primary">
        {promo.impulseTitle}
      </h2>
      <div
        dir="rtl"
        className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"
      >
        {products.map((product) => {
          const weight = product.weightOptions[0];
          if (!weight) return null;
          const price = getEffectiveWeightPrice(product, weight);
          const coverSrc = product.images[0] ?? "";
          const coverFit = imageFitForSrc(product.imageFits, coverSrc);
          return (
            <div
              key={product.id}
              className="w-36 shrink-0 rounded-2xl border border-border bg-surface p-2"
            >
              <Link
                href={hajiasalPath(`/product/${product.slug}`)}
                className={`relative mb-2 block aspect-square overflow-hidden rounded-xl ${catalogMediaClass(coverSrc, coverFit)}`}
              >
                <ProductImage
                  src={coverSrc}
                  alt={product.title}
                  fill
                  fit={catalogImageFit(coverSrc, coverFit)}
                  imageFit={coverFit}
                  sizes="144px"
                />
              </Link>
              <p className="mb-1 line-clamp-2 min-h-8 text-xs text-primary">
                {product.title}
              </p>
              <p className="mb-2 min-w-0 overflow-hidden">
                <PriceText
                  amount={price}
                  className="text-[11px] font-semibold text-gold"
                />
              </p>
              <button
                type="button"
                disabled={busyId === product.id}
                aria-label={`افزودن ${product.title}`}
                className="flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-gold text-xs font-medium text-ink-on-gold disabled:opacity-50"
                onClick={() => {
                  setBusyId(product.id);
                  addItem(
                    {
                      productId: product.id,
                      slug: product.slug,
                      title: product.title,
                      image: coverSrc,
                      imageFit: coverFit,
                      weight: { ...weight, price },
                      inStock: true,
                      stockQty: product.stockQty,
                      priceAtAdd: price,
                      sellerId: product.sellerId,
                    },
                    1,
                  );
                  setBusyId(null);
                }}
              >
                <Plus size={14} weight="bold" />
                افزودن
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ShoppingCartSimple } from "@phosphor-icons/react";
import type { Product } from "@/types";
import {
  getDiscountPercent,
} from "@/lib/product-eligibility";
import { isProductPurchasable } from "@/lib/product-availability";
import {
  getEffectiveWeightPrice,
  getMinPrice,
} from "@/lib/products";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RatingStars } from "@/components/ui/RatingStars";
import { FramedProductImage } from "@/components/product/media/FramedProductImage";
import { useWishlistStore } from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { pushWishlistReplace } from "@/lib/client/wishlist-sync";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { imageFitForSrc } from "@/lib/product-image";

type DealProductCardProps = {
  product: Product;
};

export function DealProductCard({ product }: DealProductCardProps) {
  const minPrice = getMinPrice(product);
  const discountPct = getDiscountPercent(product);
  const purchasable = isProductPurchasable(product);
  const defaultWeight =
    product.weightOptions?.reduce((a, b) =>
      a.price <= b.price ? a : b,
    ) ?? product.weightOptions?.[0];

  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore((s) => s.has(product.id));
  const hasHydrated = useWishlistStore((s) => s._hasHydrated);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [adding, setAdding] = useState(false);

  const coverSrc = product.images[0] ?? "";
  const coverFit = imageFitForSrc(product.imageFits, coverSrc);

  const onToggleWishlist = () => {
    if (!hasHydrated) return;
    toggleWishlist(product.id);
    void pushWishlistReplace();
  };

  const onQuickAdd = async () => {
    if (!purchasable || !defaultWeight || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/cart/validate-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!data.success) {
        useCartStore.getState().setAnnouncement(data.message ?? "خطا در افزودن");
        return;
      }
      const livePrice = getEffectiveWeightPrice(product, defaultWeight);
      addItem({
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: coverSrc,
        imageFit: coverFit,
        weight: { ...defaultWeight, price: livePrice },
        inStock: product.inStock,
        stockQty: product.stockQty,
        sellerId: product.sellerId,
      });
      openCart();
    } finally {
      setAdding(false);
    }
  };

  return (
    <article className="group relative flex h-full w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-b from-surface-elevated to-surface sm:w-[260px]">
      {discountPct > 0 ? (
        <span className="absolute start-2.5 top-2.5 z-[2] rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold text-ink-on-gold sm:text-[11px]">
          {discountPct.toLocaleString("fa-IR")}٪
        </span>
      ) : null}

      <button
        type="button"
        onClick={onToggleWishlist}
        disabled={!hasHydrated}
        className={cn(
          "absolute end-2 top-2 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-border transition-all touch-manipulation",
          !hasHydrated && "pointer-events-none opacity-60",
          isWishlisted
            ? "border-transparent bg-gold text-ink-on-gold"
            : "bg-surface/90 text-primary hover:bg-surface-elevated",
        )}
        aria-label={isWishlisted ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}
      >
        <Heart size={16} weight={isWishlisted ? "fill" : "regular"} />
      </button>

      <Link
        href={hajiasalPath(`/product/${product.slug}`)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <FramedProductImage
          src={coverSrc}
          alt={product.title}
          imageFit={coverFit}
          sizes="260px"
          imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h3 className="mb-1 line-clamp-2 min-h-[2.5rem] text-start text-xs font-semibold leading-snug text-primary sm:text-sm">
            {product.title}
          </h3>
          {product.reviewCount > 0 ? (
            <RatingStars
              rating={product.rating}
              reviewCount={product.reviewCount}
              className="mb-2"
            />
          ) : null}
          <div className="mt-auto space-y-2">
            <PriceDisplay
              price={minPrice}
              discountPrice={product.discountPrice}
              size="sm"
            />
            <p
              className={cn(
                "text-[10px] sm:text-xs",
                purchasable ? "text-emerald-600" : "text-red-500",
              )}
            >
              {purchasable ? "موجود" : "ناموجود"}
            </p>
          </div>
        </div>
      </Link>

      <div className="border-t border-border/60 p-3 pt-0 sm:p-4 sm:pt-0">
        <button
          type="button"
          onClick={onQuickAdd}
          disabled={!purchasable || adding}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-colors sm:text-sm",
            purchasable
              ? "bg-gold text-ink-on-gold hover:bg-gold/90"
              : "cursor-not-allowed bg-border text-dim",
          )}
        >
          <ShoppingCartSimple size={16} weight="bold" />
          {adding ? "..." : "افزودن به سبد"}
        </button>
      </div>
    </article>
  );
}

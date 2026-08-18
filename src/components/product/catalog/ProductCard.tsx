"use client";

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { getMinPrice } from "@/lib/products";
import { isProductPurchasable } from "@/lib/product-availability";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RatingStars } from "@/components/ui/RatingStars";
import { ProductImage } from "@/components/ui/ProductImage";
import { useWishlistStore } from "@/store/wishlist";
import { pushWishlistReplace } from "@/lib/client/wishlist-sync";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { catalogImageFit, catalogMediaClass, imageFitForSrc } from "@/lib/product-image";
import type { ProductCardProps } from "../types";

function ProductMark({ product }: { product: Product }) {
  if (!isProductPurchasable(product)) {
    return (
      <span className="rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-medium text-white sm:text-[11px]">
        ناموجود
      </span>
    );
  }
  if (product.isBestseller) {
    return (
      <span className="rounded-md bg-gold px-2 py-0.5 text-[10px] font-medium text-ink-on-gold sm:text-[11px]">
        پرفروش
      </span>
    );
  }
  if (product.isNew) {
    return (
      <span className="rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-void sm:text-[11px]">
        جدید
      </span>
    );
  }
  return null;
}

export function ProductCard({ product }: ProductCardProps) {
  const minPrice = getMinPrice(product);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const isWishlisted = useWishlistStore((s) => s.has(product.id));
  const hasHydrated = useWishlistStore((s) => s._hasHydrated);
  const mark = <ProductMark product={product} />;
  const coverSrc = product.images[0] ?? "";
  const coverFit = imageFitForSrc(product.imageFits, coverSrc);

  const onToggleWishlist = () => {
    if (!hasHydrated) return;
    toggleWishlist(product.id);
    void pushWishlistReplace();
  };

  return (
    <article className="group h-full">
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition duration-300 hover:border-border-bright hover:shadow-[0_12px_28px_-12px_rgba(28,25,23,0.18)]">
        <Link
          href={hajiasalPath(`/product/${product.slug}`)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div
            className={cn(
              catalogMediaClass(coverSrc, coverFit),
              "relative aspect-square overflow-hidden",
            )}
          >
            <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]">
              <ProductImage
                src={coverSrc}
                alt={product.title}
                fill
                fit={catalogImageFit(coverSrc, coverFit)}
                imageFit={coverFit}
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
            {mark ? (
              <div className="absolute start-2.5 top-2.5 z-[1]">{mark}</div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
            <p className="mb-1 truncate text-[10px] text-dim sm:text-xs">
              {product.categoryLabel}
            </p>
            <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] min-w-0 text-start text-xs font-semibold leading-snug text-primary sm:min-h-[2.625rem] sm:text-sm">
              {product.title}
            </h3>
            {product.reviewCount > 0 ? (
              <RatingStars
                rating={product.rating}
                reviewCount={product.reviewCount}
                className="mb-2 min-w-0"
              />
            ) : null}
            <div className="mt-auto min-w-0 pt-1">
              <PriceDisplay
                price={minPrice}
                discountPrice={product.discountPrice}
                size="sm"
              />
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={onToggleWishlist}
          disabled={!hasHydrated}
          className={cn(
            "absolute end-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-border transition-all touch-manipulation",
            !hasHydrated && "pointer-events-none opacity-60",
            isWishlisted
              ? "bg-gold text-ink-on-gold border-transparent"
              : "bg-surface text-primary hover:bg-surface-elevated",
          )}
          aria-label={
            isWishlisted ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"
          }
        >
          <Heart size={18} weight={isWishlisted ? "fill" : "regular"} />
        </button>
      </div>
    </article>
  );
}

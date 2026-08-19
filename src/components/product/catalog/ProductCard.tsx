"use client";

import Link from "next/link";
import { Heart } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { getMinPrice } from "@/lib/products";
import { isProductPurchasable } from "@/lib/product-availability";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RatingStars } from "@/components/ui/RatingStars";
import { FramedProductImage } from "@/components/product/media/FramedProductImage";
import { imageFitForSrc } from "@/lib/product-image";
import { useWishlistStore } from "@/store/wishlist";
import { pushWishlistReplace } from "@/lib/client/wishlist-sync";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
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
    <article className="group h-full min-w-0">
      <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface sm:rounded-2xl">
        <Link
          href={hajiasalPath(`/product/${product.slug}`)}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <div className="relative aspect-square min-w-0 overflow-hidden bg-surface-muted/40">
            <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]">
              <FramedProductImage
                src={coverSrc}
                alt={product.title}
                imageFit={coverFit}
                sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
                aspectClassName="relative h-full w-full overflow-hidden"
                className="h-full w-full"
              />
            </div>
            {mark ? (
              <div className="absolute start-2 top-2 z-[1] sm:start-2.5 sm:top-2.5">
                {mark}
              </div>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3 md:p-4">
            <p className="mb-0.5 truncate text-[10px] text-dim sm:mb-1 sm:text-xs">
              {product.categoryLabel}
            </p>
            <h3 className="mb-1.5 line-clamp-2 min-w-0 text-start text-[11px] font-semibold leading-snug text-primary sm:mb-2 sm:text-xs md:text-sm">
              {product.title}
            </h3>
            {product.reviewCount > 0 ? (
              <RatingStars
                rating={product.rating}
                reviewCount={product.reviewCount}
                className="mb-1.5 min-w-0 sm:mb-2"
              />
            ) : null}
            <div className="mt-auto min-w-0 pt-0.5">
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
            "absolute end-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border transition-all touch-manipulation sm:end-2 sm:top-2 sm:h-9 sm:w-9",
            !hasHydrated && "pointer-events-none opacity-60",
            isWishlisted
              ? "border-transparent bg-gold text-ink-on-gold"
              : "bg-surface/95 text-primary backdrop-blur-[2px] hover:bg-surface-elevated",
          )}
          aria-label={
            isWishlisted ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"
          }
        >
          <Heart size={16} weight={isWishlisted ? "fill" : "regular"} />
        </button>
      </div>
    </article>
  );
}

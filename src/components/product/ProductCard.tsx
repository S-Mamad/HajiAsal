"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Heart } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { getMinPrice } from "@/lib/products";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RatingStars } from "@/components/ui/RatingStars";
import { ProductImage } from "@/components/ui/ProductImage";
import { useWishlistStore } from "@/store/wishlist";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";

interface ProductCardProps {
  product: Product;
}

function ProductMark({ product }: { product: Product }) {
  if (!product.inStock) {
    return (
      <span className="text-[10px] font-medium tracking-wide text-red-400/90 sm:text-[11px]">
        ناموجود
      </span>
    );
  }
  if (product.isBestseller) {
    return (
      <span className="text-[10px] font-medium tracking-wide text-gold sm:text-[11px]">
        پرفروش
      </span>
    );
  }
  if (product.isNew) {
    return (
      <span className="text-[10px] font-medium tracking-wide text-primary/75 sm:text-[11px]">
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
  const mark = <ProductMark product={product} />;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="group"
    >
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(212,160,86,0.15)] sm:rounded-2xl">
        <Link href={hajiasalPath(`/product/${product.slug}`)} className="block">
          <div className="relative aspect-square overflow-hidden bg-surface-muted">
            <ProductImage
              src={product.images[0]}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
            />
            {mark ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-void/80 via-void/35 to-transparent px-2.5 pb-2 pt-8 sm:px-3 sm:pb-2.5">
                {mark}
              </div>
            ) : null}
          </div>
          <div className="p-2.5 sm:p-4">
            <p className="mb-0.5 text-[10px] text-dim sm:mb-1 sm:text-xs">
              {product.categoryLabel}
            </p>
            <h3 className="mb-1.5 line-clamp-2 text-xs font-semibold leading-snug text-primary sm:mb-2 sm:line-clamp-1 sm:text-sm">
              {product.title}
            </h3>
            <RatingStars
              rating={product.rating}
              reviewCount={product.reviewCount}
              className="mb-2 hidden sm:mb-3 sm:flex"
            />
            <PriceDisplay
              price={minPrice}
              discountPrice={product.discountPrice}
              size="sm"
            />
          </div>
        </Link>
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          className={cn(
            "absolute end-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-sm transition-all sm:end-3 sm:top-3 sm:h-9 sm:w-9",
            isWishlisted
              ? "bg-gold text-ink-on-gold"
              : "bg-surface-elevated text-primary hover:bg-surface-muted",
          )}
          aria-label="علاقه‌مندی"
        >
          <Heart
            size={14}
            weight={isWishlisted ? "fill" : "regular"}
            className="sm:hidden"
          />
          <Heart
            size={16}
            weight={isWishlisted ? "fill" : "regular"}
            className="hidden sm:block"
          />
        </button>
      </div>
    </motion.article>
  );
}

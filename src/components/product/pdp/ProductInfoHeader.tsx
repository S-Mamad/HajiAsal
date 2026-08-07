"use client";

import Link from "next/link";
import { RatingStars } from "@/components/ui/RatingStars";
import { hajiasalPath } from "@/lib/paths";
import type { ProductInfoHeaderProps } from "../types";

export function ProductInfoHeader({
  product,
  purchasable,
}: ProductInfoHeaderProps) {
  const statusLabel = !purchasable
    ? "ناموجود"
    : product.isBestseller
      ? "پرفروش"
      : product.isNew
        ? "جدید"
        : null;

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <Link
          href={hajiasalPath(`/shop?category=${product.category}`)}
          className="text-dim transition-colors hover:text-gold"
        >
          {product.categoryLabel}
        </Link>
        {statusLabel ? (
          <>
            <span className="h-1 w-1 rounded-sm bg-border-bright" aria-hidden />
            <span
              className={
                !purchasable
                  ? "font-medium text-red-500"
                  : "font-medium text-gold"
              }
            >
              {statusLabel}
            </span>
          </>
        ) : null}
      </div>

      <h1 className="font-display text-[2rem] leading-[1.2] tracking-tight text-primary text-balance md:text-[2.65rem] md:leading-[1.15]">
        {product.title}
      </h1>

      <RatingStars
        rating={product.rating}
        reviewCount={product.reviewCount}
        size="md"
      />

      <p className="max-w-[42ch] text-[15px] leading-relaxed text-secondary md:text-base">
        {product.shortDescription}
      </p>
    </header>
  );
}

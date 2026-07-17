"use client";

import { useRef } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Icon } from "@/components/ui/Icon";

interface RelatedProductsCarouselProps {
  products: Product[];
}

export function RelatedProductsCarousel({
  products,
}: RelatedProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-[var(--pdp-border)] pt-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--pdp-text)]">
            محصولات مرتبط
          </h2>
          <p className="mt-1 text-sm text-[var(--pdp-muted)]">
            دیگر محصولات این دسته
          </p>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pdp-border)] text-[var(--pdp-text)] hover:border-[var(--pdp-accent)] hover:text-[var(--pdp-accent)]"
            aria-label="قبلی"
          >
            <Icon icon={CaretRight} size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--pdp-border)] text-[var(--pdp-text)] hover:border-[var(--pdp-accent)] hover:text-[var(--pdp-accent)]"
            aria-label="بعدی"
          >
            <Icon icon={CaretLeft} size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[260px] shrink-0 snap-start md:w-[280px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}

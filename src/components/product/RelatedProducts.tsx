"use client";

import { useRef } from "react";
import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { getMinPrice } from "@/lib/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { ProductImage } from "@/components/ui/ProductImage";
import { Reveal } from "@/components/ui/Reveal";

interface RelatedProductsProps {
  products: Product[];
}

export function RelatedProducts({ products }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-16 border-t border-border pt-16 md:mt-24 md:pt-24">
      <Reveal className="mb-8">
        <div className="flex flex-col items-center gap-6">
          <SectionHeading title="محصولات مرتبط" variant="decorated" />
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scroll("right")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-bright text-secondary transition-colors hover:border-gold/50 hover:text-gold"
              aria-label="قبلی"
            >
              <CaretRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => scroll("left")}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-bright text-secondary transition-colors hover:border-gold/50 hover:text-gold"
              aria-label="بعدی"
            >
              <CaretLeft size={18} />
            </button>
          </div>
        </div>
      </Reveal>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4"
      >
        {products.map((product) => {
          const minPrice = getMinPrice(product);
          const weightLabel = product.weightOptions[0]?.label ?? "";

          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              className="group flex w-[min(100%,280px)] shrink-0 snap-start items-center gap-4 rounded-2xl border border-border bg-surface p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(212,160,86,0.15)]"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                <ProductImage
                  src={product.images[0]}
                  alt={product.title}
                  fill
                  sizes="80px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-primary">
                  {product.title}
                </p>
                <p className="text-xs text-dim">{weightLabel}</p>
              </div>
              <PriceDisplay price={minPrice} size="sm" className="shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

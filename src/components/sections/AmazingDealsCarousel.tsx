"use client";

import { useRef } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { DealProductCard } from "@/components/product/catalog/DealProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

type AmazingDealsCarouselProps = {
  products: Product[];
  title: string;
  subtitle: string;
};

export function AmazingDealsCarousel({
  products,
  title,
  subtitle,
}: AmazingDealsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="mb-5 flex items-end justify-between gap-4 md:mb-8">
          <SectionHeading title={title} subtitle={subtitle} />
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
        </Reveal>

        <div
          ref={scrollRef}
          className="scrollbar-hide flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 touch-pan-x md:gap-4"
        >
          {products.map((product) => (
            <DealProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

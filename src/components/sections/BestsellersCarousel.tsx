"use client";

import { useRef } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { Product } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

interface BestsellersCarouselProps {
  products: Product[];
}

export function BestsellersCarousel({ products }: BestsellersCarouselProps) {
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
    <section className="py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="mb-5 flex items-end justify-between gap-4 md:mb-8">
          <SectionHeading
            title="پرفروش‌ترین‌ها"
            subtitle="محبوب‌ترین عسل‌های حاجی عسل"
          />
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

        {/* Mobile: clean 2-col grid. Desktop: horizontal carousel */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div
          ref={scrollRef}
          className="scrollbar-hide hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-4 sm:flex md:gap-6"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[240px] shrink-0 snap-start md:w-[280px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <div className="mt-6 text-center md:mt-8">
          <Button href={hajiasalPath("/shop")} variant="outline" className="w-full sm:w-auto">
            مشاهده همه محصولات
          </Button>
        </div>
      </div>
    </section>
  );
}

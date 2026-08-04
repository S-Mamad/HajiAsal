"use client";

import { useRef } from "react";
import { ArrowLeft, CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { Product, ProductCategory } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

interface RelatedProductsProps {
  products: Product[];
  category?: ProductCategory;
  categoryLabel?: string;
}

export function RelatedProducts({
  products,
  category,
  categoryLabel,
}: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const label =
    categoryLabel?.trim() ||
    products[0]?.categoryLabel?.trim() ||
    "همین دسته";
  const categoryKey = category ?? products[0]?.category;
  const shopHref = categoryKey
    ? hajiasalPath(`/shop?category=${categoryKey}`)
    : hajiasalPath("/shop");
  const useCarousel = products.length > 4;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mt-16 border-t border-border pt-14 md:mt-24 md:pt-20">
      <Reveal className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <SectionHeading
          title="شاید این‌ها را هم بپسندید"
          subtitle={`محصولات دیگر دسته ${label}`}
        />
        {useCarousel ? (
          <div className="hidden items-center gap-2 sm:flex">
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
        ) : null}
      </Reveal>

      {/* Mobile: always a clean 2-col grid */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {useCarousel ? (
        <div
          ref={scrollRef}
          className="scrollbar-hide hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:flex md:gap-5"
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="w-[220px] shrink-0 snap-start md:w-[260px]"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`hidden gap-4 sm:grid md:gap-5 ${
            products.length === 1
              ? "sm:grid-cols-2 lg:grid-cols-4"
              : products.length === 2
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : products.length === 3
                  ? "sm:grid-cols-3 lg:grid-cols-3"
                  : "sm:grid-cols-2 lg:grid-cols-4"
          }`}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-7 flex justify-center md:mt-9">
        <Button href={shopHref} variant="outline" className="gap-2">
          مشاهده همه {label}
          <ArrowLeft size={16} weight="bold" />
        </Button>
      </div>
    </section>
  );
}

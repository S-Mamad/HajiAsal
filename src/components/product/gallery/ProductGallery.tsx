"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  catalogImageFit,
  catalogMediaClass,
  imageFitForSrc,
} from "@/lib/product-image";
import { ProductImage } from "@/components/ui/ProductImage";
import type { ProductGalleryProps } from "../types";

export function ProductGallery({
  images,
  title,
  imageFits,
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  const thumbnailBtn = (img: string, i: number, vertical: boolean) => {
    const fit = imageFitForSrc(imageFits, img);
    return (
      <button
        key={`${img}-${i}`}
        type="button"
        onClick={() => setActiveIndex(i)}
        aria-label={`تصویر ${i + 1}`}
        aria-current={i === activeIndex ? "true" : undefined}
        className={cn(
          catalogMediaClass(img, fit),
          "relative shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
          vertical ? "h-16 w-16 md:h-[72px] md:w-[72px]" : "h-16 w-16",
          i === activeIndex
            ? "border-gold ring-2 ring-gold/30"
            : "border-border hover:border-border-bright",
        )}
      >
        <ProductImage
          src={img}
          alt={`${title} - ${i + 1}`}
          fill
          fit={catalogImageFit(img, fit)}
          imageFit={fit}
          sizes="72px"
        />
      </button>
    );
  };

  const activeSrc = images[activeIndex] ?? "";
  const activeFit = imageFitForSrc(imageFits, activeSrc);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {images.length > 1 ? (
          <div className="scrollbar-hide hidden flex-col gap-3 lg:flex">
            {images.map((img, i) => thumbnailBtn(img, i, true))}
          </div>
        ) : null}

        <div
          className={cn(
            "gallery-frame relative aspect-square w-full flex-1 overflow-hidden",
            catalogMediaClass(activeSrc, activeFit),
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.3 }}
              className={cn(
                "absolute inset-0",
                catalogMediaClass(activeSrc, activeFit),
              )}
            >
              <ProductImage
                src={activeSrc}
                alt={title}
                fill
                fit={catalogImageFit(activeSrc, activeFit)}
                imageFit={activeFit}
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {images.length > 1 ? (
        <div className="scrollbar-hide flex gap-3 overflow-x-auto lg:hidden">
          {images.map((img, i) => thumbnailBtn(img, i, false))}
        </div>
      ) : null}
    </div>
  );
}

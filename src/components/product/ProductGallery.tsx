"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";

interface ProductGalleryProps {
  images: string[];
  title: string;
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  const thumbnailBtn = (img: string, i: number, vertical: boolean) => (
    <button
      key={`${img}-${i}`}
      type="button"
      onClick={() => setActiveIndex(i)}
      className={cn(
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
        sizes="72px"
        className="object-cover"
      />
    </button>
  );

  return (
    <div className="flex flex-col gap-4 lg:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
        {images.length > 1 ? (
          <div className="scrollbar-hide hidden flex-col gap-3 lg:flex">
            {images.map((img, i) => thumbnailBtn(img, i, true))}
          </div>
        ) : null}

        <div className="gallery-frame relative aspect-[4/5] w-full flex-1 overflow-hidden bg-surface-muted lg:aspect-[4/5]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,160,86,0.12),transparent_70%)]" />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.3 }}
              className="absolute inset-0"
            >
              <ProductImage
                src={images[activeIndex]}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
                className="object-cover"
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

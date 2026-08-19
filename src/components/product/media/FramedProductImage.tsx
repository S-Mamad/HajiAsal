"use client";

import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/ui/ProductImage";
import {
  catalogImageFit,
  catalogMediaClass,
  type ProductImageFit,
} from "@/lib/product-image";

export type FramedProductImageProps = {
  src: string;
  alt: string;
  imageFit?: ProductImageFit | null;
  sizes?: string;
  priority?: boolean;
  /** Classes on the outer media frame (catalogMediaClass wrapper). */
  className?: string;
  /** Classes passed to ProductImage. */
  imageClassName?: string;
  aspectClassName?: string;
  fill?: boolean;
};

/** Storefront product photo with the same square frame + crop as production. */
export function FramedProductImage({
  src,
  alt,
  imageFit,
  sizes,
  priority,
  className,
  imageClassName,
  aspectClassName = "relative aspect-square overflow-hidden",
  fill = true,
}: FramedProductImageProps) {
  if (!src) return null;

  return (
    <div
      className={cn(
        catalogMediaClass(src, imageFit),
        aspectClassName,
        className,
      )}
    >
      <ProductImage
        src={src}
        alt={alt}
        fill={fill}
        fit={catalogImageFit(src, imageFit)}
        imageFit={imageFit}
        sizes={sizes}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}

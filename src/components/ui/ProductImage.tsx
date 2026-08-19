"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  productImageFitStyle,
  resolveProductImageSrc,
  shouldUnoptimizeProductImage,
  type ProductImageFit,
} from "@/lib/product-image";

interface ProductImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fit?: "cover" | "contain";
  imageFit?: ProductImageFit | null;
}

export function ProductImage({
  src,
  alt,
  fill = false,
  sizes,
  priority = false,
  className,
  style,
  fit = "cover",
  imageFit,
}: ProductImageProps) {
  const resolved = resolveProductImageSrc(src);
  const [imgSrc, setImgSrc] = useState(resolved);

  useEffect(() => {
    setImgSrc(resolved);
  }, [resolved]);

  const cropStyle = productImageFitStyle(imageFit);
  const objectFit = cropStyle ? "cover" : fit;
  const unoptimized = shouldUnoptimizeProductImage(imgSrc);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      unoptimized={unoptimized}
      className={cn(
        fill && "h-full w-full",
        objectFit === "contain" ? "object-contain" : "object-cover",
        "object-center",
        className,
      )}
      style={{
        ...(fill
          ? {
              position: "absolute",
              inset: 0,
              insetInlineStart: 0,
              insetInlineEnd: 0,
              width: "100%",
              height: "100%",
              maxWidth: "none",
              maxHeight: "none",
            }
          : null),
        objectFit,
        objectPosition: "50% 50%",
        ...style,
        ...cropStyle,
      }}
      onError={() => setImgSrc("/images/hajiasal/placeholder.svg")}
    />
  );
}

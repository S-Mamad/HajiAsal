"use client";

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { resolveProductImageSrc } from "@/lib/product-image";

interface ProductImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function ProductImage({
  src,
  alt,
  fill = false,
  sizes,
  priority = false,
  className,
}: ProductImageProps) {
  const resolved = resolveProductImageSrc(src);
  const [imgSrc, setImgSrc] = useState(resolved);

  useEffect(() => {
    setImgSrc(resolved);
  }, [resolved]);

  const isSvg = imgSrc.toLowerCase().endsWith(".svg");

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      unoptimized={isSvg}
      className={cn(className)}
      onError={() => setImgSrc("/images/hajiasal/placeholder.svg")}
    />
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={cn(className)}
      onError={() => setImgSrc("/images/hajiasal/placeholder.svg")}
    />
  );
}

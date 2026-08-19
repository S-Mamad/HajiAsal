"use client";

import { useRef } from "react";
import { ProductImagesEditor } from "@/components/product/media/ProductImagesEditor";
import type { ProductImageFit } from "@/lib/product-image";

async function uploadSellerImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/seller/media", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? "آپلود تصویر ناموفق بود",
    );
  }
  const url = (data as { file?: { url?: string } }).file?.url;
  if (!url) throw new Error("آدرس تصویر از سرور برنگشت");
  return url;
}

export function SellerProductImageField({
  images,
  imageFits,
  onChange,
}: {
  images: string[];
  imageFits?: Record<string, ProductImageFit>;
  onChange: (
    images: string[],
    imageFits: Record<string, ProductImageFit>,
  ) => void;
}) {
  const imagesRef = useRef(images);
  const fitsRef = useRef(imageFits ?? {});
  imagesRef.current = images;
  fitsRef.current = imageFits ?? {};

  return (
    <ProductImagesEditor
      images={images}
      imageFits={imageFits}
      onChange={(nextImages) => {
        imagesRef.current = nextImages;
        onChange(nextImages, fitsRef.current);
      }}
      onFitsChange={(nextFits) => {
        fitsRef.current = nextFits;
        onChange(imagesRef.current, nextFits);
      }}
      canUpload
      uploadFile={uploadSellerImage}
    />
  );
}

"use client";

import { useAdminAuth } from "@/components/admin/auth/AdminAuthProvider";
import { ProductImagesEditor } from "@/components/product/media/ProductImagesEditor";
import type { ProductImageFit } from "@/lib/product-image";

async function uploadAdminImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "products");
  const res = await fetch("/api/admin/media", {
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
  const url = (data as { item?: { url?: string } }).item?.url;
  if (!url) throw new Error("آدرس تصویر از سرور برنگشت");
  return url;
}

export function MediaDropzone({
  images,
  onChange,
  imageFits,
  onFitsChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  imageFits?: Record<string, ProductImageFit>;
  onFitsChange: (next: Record<string, ProductImageFit>) => void;
}) {
  const { can } = useAdminAuth();
  const canUpload = can("media.manage") || can("products.edit");

  return (
    <ProductImagesEditor
      images={images}
      onChange={onChange}
      imageFits={imageFits}
      onFitsChange={onFitsChange}
      canUpload={canUpload}
      uploadFile={uploadAdminImage}
    />
  );
}

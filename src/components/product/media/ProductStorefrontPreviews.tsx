"use client";

import { FramedProductImage } from "@/components/product/media/FramedProductImage";
import type { ProductImageFit } from "@/lib/product-image";

function PreviewTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

/** Mini storefront previews — same templates as live site. */
export function ProductStorefrontPreviews({
  src,
  imageFit,
  title = "محصول",
}: {
  src: string;
  imageFit?: ProductImageFit | null;
  title?: string;
}) {
  if (!src) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <PreviewTile label="کارت فروشگاه">
        <div className="w-[108px] overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <FramedProductImage
            src={src}
            alt={title}
            imageFit={imageFit}
            sizes="108px"
          />
        </div>
      </PreviewTile>

      <PreviewTile label="سبد خرید">
        <FramedProductImage
          src={src}
          alt={title}
          imageFit={imageFit}
          sizes="64px"
          className="h-16 w-16 rounded-xl border border-zinc-200"
          aspectClassName="relative h-full w-full overflow-hidden"
        />
      </PreviewTile>

      <PreviewTile label="جستجو">
        <FramedProductImage
          src={src}
          alt={title}
          imageFit={imageFit}
          sizes="48px"
          className="h-12 w-12 rounded-lg border border-zinc-200"
          aspectClassName="relative h-full w-full overflow-hidden"
        />
      </PreviewTile>

      <PreviewTile label="صفحه محصول">
        <div className="gallery-frame w-[108px]">
          <FramedProductImage
            src={src}
            alt={title}
            imageFit={imageFit}
            sizes="108px"
            aspectClassName="relative aspect-square w-full overflow-hidden"
          />
        </div>
      </PreviewTile>
    </div>
  );
}

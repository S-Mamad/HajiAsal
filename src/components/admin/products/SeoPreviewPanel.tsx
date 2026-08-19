"use client";

import type { ProductSeo } from "@/types";
import { hajiasalAbsoluteUrl } from "@/lib/paths";
import { cn } from "@/lib/utils";
import {
  catalogImageFit,
  imageFitForSrc,
  productImageFitStyle,
  resolveProductImageSrc,
  type ProductImageFit,
} from "@/lib/product-image";

function PreviewCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <p className="mb-2 text-xs font-medium text-stone-500">{label}</p>
      {children}
    </div>
  );
}

function SocialPreviewImage({
  src,
  imageFit,
  className,
}: {
  src: string;
  imageFit?: ProductImageFit | null;
  className?: string;
}) {
  const resolved = resolveProductImageSrc(src);
  const cropStyle = productImageFitStyle(imageFit);
  const objectFit = cropStyle ? "cover" : catalogImageFit(src, imageFit);

  return (
    <div
      className={cn(
        "product-media product-media--fitted relative overflow-hidden bg-stone-100",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolved}
        alt=""
        className="absolute inset-0 h-full w-full object-center"
        style={{
          objectFit,
          ...cropStyle,
        }}
      />
    </div>
  );
}

export function SeoPreviewPanel({
  title,
  slug,
  shortDescription,
  images,
  imageFits,
  seo,
}: {
  title: string;
  slug: string;
  shortDescription: string;
  images: string[];
  imageFits?: Record<string, ProductImageFit>;
  seo?: ProductSeo;
}) {
  const url = seo?.canonical || hajiasalAbsoluteUrl(`/product/${slug || "slug"}`);
  const serpTitle = seo?.title || title || "عنوان محصول";
  const serpDesc =
    seo?.description ||
    shortDescription ||
    "توضیح کوتاه محصول اینجا نمایش داده می‌شود.";
  const ogTitle = seo?.ogTitle || serpTitle;
  const ogDesc = seo?.ogDescription || serpDesc;
  const coverSrc = seo?.ogImage || images[0] || "";
  const ogImage = resolveProductImageSrc(coverSrc);
  const ogFit = imageFitForSrc(imageFits, coverSrc);
  const twTitle = seo?.twitterTitle || ogTitle;
  const twDesc = seo?.twitterDescription || ogDesc;
  const twSrc = seo?.twitterImage || coverSrc;
  const twImage = resolveProductImageSrc(twSrc);
  const twFit = imageFitForSrc(imageFits, twSrc);
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "hajiasal.ir";
    }
  })();

  return (
    <div className="space-y-4">
      <PreviewCard label="Google SERP">
        <p className="truncate text-sm text-[#1a0dab]">{serpTitle}</p>
        <p className="truncate text-xs text-[#006621]">{url}</p>
        <p className="mt-1 line-clamp-2 text-xs text-[#4d5156]">{serpDesc}</p>
      </PreviewCard>

      <PreviewCard label="Facebook / Open Graph">
        <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-50">
          {ogImage ? (
            <SocialPreviewImage
              src={coverSrc}
              imageFit={ogFit}
              className="h-36 w-full"
            />
          ) : (
            <div className="flex h-36 items-center justify-center text-xs text-stone-400">
              بدون تصویر
            </div>
          )}
          <div className="space-y-1 p-3">
            <p className="text-[10px] uppercase text-stone-400">{host}</p>
            <p className="text-sm font-semibold text-stone-900">{ogTitle}</p>
            <p className="line-clamp-2 text-xs text-stone-600">{ogDesc}</p>
          </div>
        </div>
      </PreviewCard>

      <PreviewCard label="Twitter / X">
        <div className="overflow-hidden rounded-2xl border border-stone-200">
          {twImage ? (
            <SocialPreviewImage
              src={twSrc}
              imageFit={twFit}
              className="h-40 w-full"
            />
          ) : null}
          <div className="space-y-1 p-3">
            <p className="text-sm font-semibold">{twTitle}</p>
            <p className="line-clamp-2 text-xs text-stone-600">{twDesc}</p>
            <p className="text-[10px] text-stone-400">{host}</p>
          </div>
        </div>
      </PreviewCard>

      <PreviewCard label="LinkedIn">
        <div className="overflow-hidden rounded border border-stone-200">
          {ogImage ? (
            <SocialPreviewImage
              src={coverSrc}
              imageFit={ogFit}
              className="h-32 w-full"
            />
          ) : null}
          <div className="space-y-1 bg-stone-50 p-3">
            <p className="text-sm font-semibold text-stone-900">{ogTitle}</p>
            <p className="text-[10px] text-stone-500">{host}</p>
          </div>
        </div>
      </PreviewCard>
    </div>
  );
}

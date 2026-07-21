"use client";

import type { ProductSeo } from "@/types";
import { hajiasalAbsoluteUrl } from "@/lib/paths";

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

export function SeoPreviewPanel({
  title,
  slug,
  shortDescription,
  images,
  seo,
}: {
  title: string;
  slug: string;
  shortDescription: string;
  images: string[];
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
  const ogImage = seo?.ogImage || images[0] || "";
  const twTitle = seo?.twitterTitle || ogTitle;
  const twDesc = seo?.twitterDescription || ogDesc;
  const twImage = seo?.twitterImage || ogImage;
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ogImage} alt="" className="h-36 w-full object-cover" />
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={twImage} alt="" className="h-40 w-full object-cover" />
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ogImage} alt="" className="h-32 w-full object-cover" />
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

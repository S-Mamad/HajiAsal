import type { SiteConfig } from "@/types";
import type { AmazingDealsSort } from "@/types";

export type ResolvedHomeSliderSettings = {
  autoplay: boolean;
  intervalMs: number;
};

export type ResolvedAmazingDealsSection = {
  enabled: boolean;
  title: string;
  subtitle: string;
  limit: number;
  sort: AmazingDealsSort;
};

export type ResolvedSellerBannerSection = {
  enabled: boolean;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaHref: string;
};

const DEFAULT_HOME_SLIDER: ResolvedHomeSliderSettings = {
  autoplay: true,
  intervalMs: 6000,
};

const DEFAULT_AMAZING_DEALS: ResolvedAmazingDealsSection = {
  enabled: true,
  title: "پیشنهادات شگفت‌انگیز",
  subtitle: "تخفیف‌های ویژه روی محصولات موجود",
  limit: 8,
  sort: "discount-desc",
};

const DEFAULT_SELLER_BANNER: ResolvedSellerBannerSection = {
  enabled: true,
  title: "فروشنده حاجی عسل شوید",
  description:
    "محصولات خود را در کنار محصولات باکیفیت حاجی عسل عرضه کنید و به جمع فروشندگان ما بپیوندید.",
  image: "/images/hajiasal/hero-studio.webp",
  ctaText: "ثبت درخواست فروشندگی",
  ctaHref: "/seller/apply",
};

export function resolveHomeSliderSettings(
  settings: Pick<SiteConfig, "homeSlider">,
): ResolvedHomeSliderSettings {
  const raw = settings.homeSlider ?? {};
  const intervalMs =
    typeof raw.intervalMs === "number" && raw.intervalMs >= 2000
      ? Math.min(raw.intervalMs, 30000)
      : DEFAULT_HOME_SLIDER.intervalMs;
  return {
    autoplay: raw.autoplay !== false,
    intervalMs,
  };
}

export function resolveAmazingDealsSection(
  settings: Pick<SiteConfig, "homeSections">,
): ResolvedAmazingDealsSection {
  const raw = settings.homeSections?.amazingDeals ?? {};
  const limit =
    typeof raw.limit === "number" && raw.limit >= 1
      ? Math.min(raw.limit, 24)
      : DEFAULT_AMAZING_DEALS.limit;
  const sort =
    raw.sort === "popular" || raw.sort === "newest"
      ? raw.sort
      : DEFAULT_AMAZING_DEALS.sort;
  return {
    enabled: raw.enabled !== false,
    title: raw.title?.trim() || DEFAULT_AMAZING_DEALS.title,
    subtitle: raw.subtitle?.trim() || DEFAULT_AMAZING_DEALS.subtitle,
    limit,
    sort,
  };
}

export function resolveSellerBannerSection(
  settings: Pick<SiteConfig, "homeSections">,
): ResolvedSellerBannerSection {
  const raw = settings.homeSections?.sellerBanner ?? {};
  return {
    enabled: raw.enabled !== false,
    title: raw.title?.trim() || DEFAULT_SELLER_BANNER.title,
    description: raw.description?.trim() || DEFAULT_SELLER_BANNER.description,
    image: raw.image?.trim() || DEFAULT_SELLER_BANNER.image,
    ctaText: raw.ctaText?.trim() || DEFAULT_SELLER_BANNER.ctaText,
    ctaHref: raw.ctaHref?.trim() || DEFAULT_SELLER_BANNER.ctaHref,
  };
}

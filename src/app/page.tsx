import type { Metadata } from "next";
import { getActiveHomeSliderSlides } from "@/lib/server/admin-platform-store";
import { getAmazingDealsAsync, getBestsellersAsync } from "@/lib/server/products-store";
import { getFeaturedReviewsAsync } from "@/lib/server/reviews";
import { getSiteSettings } from "@/lib/server/site-settings";
import {
  resolveAmazingDealsSection,
  resolveHomeSliderSettings,
  resolveSellerBannerSection,
} from "@/lib/home-sections";
import { HeroSlider } from "@/components/sections/HeroSlider";
import { TrustBar } from "@/components/sections/TrustBar";
import { BestsellersCarousel } from "@/components/sections/BestsellersCarousel";
import { AmazingDealsCarousel } from "@/components/sections/AmazingDealsCarousel";
import { PromoBanner } from "@/components/sections/PromoBanner";
import { CategoryGrid } from "@/components/sections/CategoryGrid";
import { BrandStory } from "@/components/sections/BrandStory";
import { SellerJoinBanner } from "@/components/sections/SellerJoinBanner";
import { Testimonials } from "@/components/sections/Testimonials";
import { ReviewForm } from "@/components/sections/ReviewForm";
import { hajiasalAbsoluteUrl } from "@/lib/paths";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";

const siteData = site as SiteConfig;

export const metadata: Metadata = {
  alternates: { canonical: hajiasalAbsoluteUrl() },
  openGraph: {
    url: hajiasalAbsoluteUrl(),
    title: `${siteData.brand.name} | عسل طبیعی و اصل`,
    description: siteData.brand.tagline,
  },
};

export default async function HomePage() {
  const settings = await getSiteSettings();
  const amazingDealsConfig = resolveAmazingDealsSection(settings);
  const sellerBannerConfig = resolveSellerBannerSection(settings);
  const sliderSettings = resolveHomeSliderSettings(settings);

  const [slides, bestsellers, amazingDeals, featuredReviews] =
    await Promise.all([
      getActiveHomeSliderSlides(),
      getBestsellersAsync(8),
      amazingDealsConfig.enabled
        ? getAmazingDealsAsync({
            limit: amazingDealsConfig.limit,
            sort: amazingDealsConfig.sort,
          })
        : Promise.resolve([]),
      getFeaturedReviewsAsync(8),
    ]);

  return (
    <>
      <HeroSlider slides={slides} settings={sliderSettings} />
      <TrustBar />
      <BestsellersCarousel products={bestsellers} />
      {amazingDealsConfig.enabled ? (
        <AmazingDealsCarousel
          products={amazingDeals}
          title={amazingDealsConfig.title}
          subtitle={amazingDealsConfig.subtitle}
        />
      ) : null}
      <PromoBanner />
      <CategoryGrid />
      <BrandStory />
      <SellerJoinBanner config={sellerBannerConfig} />
      <Testimonials reviews={featuredReviews} />
      <ReviewForm />
    </>
  );
}

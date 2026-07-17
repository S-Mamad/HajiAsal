import { getBestsellersAsync } from "@/lib/server/products-store";
import { getFeaturedReviewsAsync } from "@/lib/server/reviews";
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { BestsellersCarousel } from "@/components/sections/BestsellersCarousel";
import { PromoBanner } from "@/components/sections/PromoBanner";
import { CategoryGrid } from "@/components/sections/CategoryGrid";
import { BrandStory } from "@/components/sections/BrandStory";
import { Testimonials } from "@/components/sections/Testimonials";
import { ReviewForm } from "@/components/sections/ReviewForm";

export default async function HomePage() {
  const bestsellers = await getBestsellersAsync(8);
  const featuredReviews = await getFeaturedReviewsAsync(8);

  return (
    <>
      <Hero />
      <TrustBar />
      <BestsellersCarousel products={bestsellers} />
      <PromoBanner />
      <CategoryGrid />
      <BrandStory />
      <Testimonials reviews={featuredReviews} />
      <ReviewForm />
    </>
  );
}

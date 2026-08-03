import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { SocialFollowSection } from "@/components/social/SocialFollowSection";
import { getSiteSettings } from "@/lib/server/site-settings";
import { hajiasalCanonical } from "@/lib/paths";

export async function generateMetadata(): Promise<Metadata> {
  const siteData = await getSiteSettings();
  return {
    title: "درباره ما",
    description: siteData.brand.description,
    alternates: { canonical: hajiasalCanonical("/about") },
  };
}

export default async function AboutPage() {
  const siteData = await getSiteSettings();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24">
      <Reveal>
        <SectionHeading
          title={siteData.brand.name}
          subtitle={siteData.brand.tagline}
          className="mb-10"
        />
      </Reveal>
      <div className="flex flex-col gap-6">
        {siteData.aboutPage.paragraphs.map((p, i) => (
          <Reveal key={i} delay={i * 0.1}>
            <p className="text-base leading-relaxed text-secondary md:text-lg">{p}</p>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.4}>
        <SocialFollowSection
          social={siteData.social}
          className="mt-12 border-t border-border pt-10"
        />
      </Reveal>
    </div>
  );
}

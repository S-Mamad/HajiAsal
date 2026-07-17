import Image from "next/image";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

const siteData = site as SiteConfig;

export function BrandStory() {
  return (
    <section id="about" className="bg-void py-12 md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-14 md:px-8">
        <Reveal>
          <div className="mx-auto w-full max-w-[280px] sm:max-w-xs md:mx-0 md:max-w-[320px]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
              <Image
                src="/images/about/brand-story-honey.webp"
                alt="عسل طبیعی حاجی عسل در فضای کارگاه"
                fill
                sizes="(max-width: 768px) 280px, 320px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/55 via-transparent to-transparent" />
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal>
            <SectionHeading
              title={siteData.brandStory.title}
              className="mb-5 md:mb-8"
            />
          </Reveal>
          <div className="flex flex-col gap-4 md:gap-5">
            {siteData.brandStory.paragraphs.map((paragraph, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p className="text-sm leading-relaxed text-secondary md:text-base">
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.25} className="mt-7 md:mt-8">
            <Button
              href={hajiasalPath("/about")}
              variant="outline"
              className="w-full sm:w-auto"
            >
              بیشتر درباره ما
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

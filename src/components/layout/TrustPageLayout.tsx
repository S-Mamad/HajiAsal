import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import type { TrustPageContent } from "@/types";

interface TrustPageLayoutProps {
  content: TrustPageContent;
}

export function TrustPageLayout({ content }: TrustPageLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-24">
      <Reveal>
        <SectionHeading
          title={content.title}
          subtitle={content.intro}
          className="mb-8 md:mb-10"
        />
      </Reveal>
      <div className="flex flex-col gap-5 md:gap-6">
        {content.sections.map((section, i) => (
          <Reveal key={section.heading} delay={i * 0.06}>
            <article className="border-b border-border pb-5 last:border-0 md:pb-6">
              <h2 className="mb-2 text-base font-semibold text-primary md:text-lg">
                {section.heading}
              </h2>
              <p className="text-sm leading-relaxed text-secondary md:text-base">
                {section.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

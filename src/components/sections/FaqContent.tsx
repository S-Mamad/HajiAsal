"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";
import { usePageCopy } from "@/hooks/usePageCopy";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductAccordion } from "@/components/product";

export function FaqContent() {
  const siteData = useSiteSettings();
  const copy = usePageCopy();
  const items = (siteData.faq ?? []).map((f) => ({
    title: f.question,
    content: f.answer,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 md:px-6 md:py-32">
      <SectionHeading
        title={copy.faq.title}
        subtitle={copy.faq.subtitle}
        className="mb-10"
      />
      <ProductAccordion
        items={items}
        title={null}
        ariaLabel={copy.faq.title}
      />
    </div>
  );
}

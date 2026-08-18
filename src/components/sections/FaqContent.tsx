"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductAccordion } from "@/components/product";

export function FaqContent() {
  const siteData = useSiteSettings();
  const items = (siteData.faq ?? []).map((f) => ({
    title: f.question,
    content: f.answer,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 md:px-6 md:py-32">
      <SectionHeading
        title="سوالات متداول"
        subtitle="پاسخ پرسش‌های رایج درباره خرید، ارسال و نگهداری عسل"
        className="mb-10"
      />
      <ProductAccordion
        items={items}
        title={null}
        ariaLabel="سوالات متداول"
      />
    </div>
  );
}

"use client";

import { useSiteSettings } from "@/context/SiteSettingsContext";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductAccordion } from "@/components/product";

export default function FaqPage() {
  const siteData = useSiteSettings();
  const items = (siteData.faq ?? []).map((f) => ({
    title: f.question,
    content: f.answer,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:px-8 md:py-24">
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

"use client";

import faqData from "@/data/faq.json";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductAccordion } from "@/components/product/ProductAccordion";

export function FaqContent() {
  const items = faqData.map((f) => ({
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
      <ProductAccordion items={items} />
    </div>
  );
}

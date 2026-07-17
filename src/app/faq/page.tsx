"use client";

import faqData from "@/data/faq.json";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductAccordion } from "@/components/product/ProductAccordion";

export default function FaqPage() {
  const items = faqData.map((f) => ({
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
      <ProductAccordion items={items} />
    </div>
  );
}

import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { buildFaqJsonLd } from "@/lib/seo";
import { hajiasalCanonical } from "@/lib/paths";
import faqData from "@/data/faq.json";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description:
    "پاسخ پرسش‌های رایج درباره خرید، ارسال، نگهداری و اصالت عسل حاجی عسل",
  alternates: { canonical: hajiasalCanonical("/faq") },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqJsonLd = buildFaqJsonLd(
    faqData.map((f) => ({ question: f.question, answer: f.answer })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      {children}
    </>
  );
}

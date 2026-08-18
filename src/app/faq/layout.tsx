import type { Metadata } from "next";
import { serializeJsonLd } from "@/lib/json-ld";
import { buildFaqJsonLd } from "@/lib/seo";
import { hajiasalCanonical } from "@/lib/paths";
import { getFaqItems } from "@/lib/server/site-settings";

export const metadata: Metadata = {
  title: "سوالات متداول",
  description:
    "پاسخ پرسش‌های رایج درباره خرید، ارسال، نگهداری و اصالت عسل حاجی عسل",
  alternates: { canonical: hajiasalCanonical("/faq") },
};

export default async function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faq = await getFaqItems();
  const faqJsonLd = buildFaqJsonLd(
    faq.map((f) => ({ question: f.question, answer: f.answer })),
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

import type { Metadata } from "next";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { TrustPageLayout } from "@/components/layout/TrustPageLayout";
import { hajiasalPath } from "@/lib/paths";

const siteData = site as SiteConfig;
const content = siteData.trustPages!.terms;

export const metadata: Metadata = {
  title: content.title,
  description: content.intro,
  alternates: { canonical: hajiasalPath("/terms") },
};

export default function TermsPage() {
  return <TrustPageLayout content={content} />;
}

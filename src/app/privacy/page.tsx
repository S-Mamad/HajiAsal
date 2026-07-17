import type { Metadata } from "next";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { TrustPageLayout } from "@/components/layout/TrustPageLayout";
import { hajiasalPath } from "@/lib/paths";

const siteData = site as SiteConfig;
const content = siteData.trustPages!.privacy;

export const metadata: Metadata = {
  title: content.title,
  description: content.intro,
  alternates: { canonical: hajiasalPath("/privacy") },
};

export default function PrivacyPage() {
  return <TrustPageLayout content={content} />;
}

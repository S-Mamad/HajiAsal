import type { Metadata } from "next";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { TrustPageLayout } from "@/components/layout/TrustPageLayout";
import { hajiasalPath } from "@/lib/paths";

const siteData = site as SiteConfig;
const content = siteData.trustPages!.authenticity;

export const metadata: Metadata = {
  title: content.title,
  description: content.intro,
  alternates: { canonical: hajiasalPath("/authenticity") },
};

export default function AuthenticityPage() {
  return <TrustPageLayout content={content} />;
}

import type { Metadata } from "next";
import { TrustPageLayout } from "@/components/layout/TrustPageLayout";
import { hajiasalPath } from "@/lib/paths";
import { getSiteSettings } from "@/lib/server/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const content = site.trustPages!.terms;
  return {
    title: content.title,
    description: content.intro,
    alternates: { canonical: hajiasalPath("/terms") },
  };
}

export default async function TermsPage() {
  const site = await getSiteSettings();
  return <TrustPageLayout kind="terms" content={site.trustPages!.terms} />;
}

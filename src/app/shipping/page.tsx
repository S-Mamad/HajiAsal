import type { Metadata } from "next";
import { TrustPageLayout } from "@/components/layout/TrustPageLayout";
import { hajiasalPath } from "@/lib/paths";
import { getSiteSettings } from "@/lib/server/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const content = site.trustPages!.shipping;
  return {
    title: content.title,
    description: content.intro,
    alternates: { canonical: hajiasalPath("/shipping") },
  };
}

export default async function ShippingPage() {
  const site = await getSiteSettings();
  return <TrustPageLayout kind="shipping" content={site.trustPages!.shipping} />;
}

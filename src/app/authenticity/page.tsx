import type { Metadata } from "next";
import { TrustPageLayout } from "@/components/layout/TrustPageLayout";
import { LabCertificateDownload } from "@/components/trust/LabCertificateDownload";
import { hajiasalPath } from "@/lib/paths";
import { getSiteSettings } from "@/lib/server/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const content = site.trustPages!.authenticity;
  return {
    title: content.title,
    description: content.intro,
    alternates: { canonical: hajiasalPath("/authenticity") },
  };
}

export default async function AuthenticityPage() {
  const site = await getSiteSettings();
  return (
    <TrustPageLayout kind="authenticity" content={site.trustPages!.authenticity}>
      <LabCertificateDownload />
    </TrustPageLayout>
  );
}

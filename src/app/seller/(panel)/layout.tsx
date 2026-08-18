import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  resolveSellerFromCustomerSession,
  storefrontLoginUrl,
} from "@/lib/auth/panel-access";
import { SellerLayout } from "@/components/seller/layout/SellerLayout";
import { PanelAccessDenied } from "@/components/auth/PanelAccessDenied";
import { hajiasalPath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "پنل فروشنده",
  robots: { index: false, follow: false },
};

export default async function SellerPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect(storefrontLoginUrl(hajiasalPath("/seller/dashboard")));
  }

  const seller = await resolveSellerFromCustomerSession(session);
  if (!seller) {
    return <PanelAccessDenied panelLabel="پنل فروشنده" />;
  }

  return (
    <SellerLayout
      shopName={seller.shopName}
      capabilities={seller.capabilities}
    >
      {children}
    </SellerLayout>
  );
}

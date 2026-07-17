import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSellerFromCookies } from "@/lib/server/sellers";
import { SellerLayout } from "@/components/seller/layout/SellerLayout";
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
  const seller = await getSellerFromCookies();
  if (!seller) redirect(hajiasalPath("/seller"));

  return <SellerLayout shopName={seller.shopName}>{children}</SellerLayout>;
}

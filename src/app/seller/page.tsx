import { redirect } from "next/navigation";
import { getSellerFromCookies } from "@/lib/server/sellers";
import { SellerLogin } from "@/components/seller/SellerLogin";
import { hajiasalPath } from "@/lib/paths";

export default async function SellerLoginPage() {
  const seller = await getSellerFromCookies();
  if (seller) redirect(hajiasalPath("/seller/dashboard"));
  return <SellerLogin />;
}

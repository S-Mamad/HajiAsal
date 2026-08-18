import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import {
  resolveSellerFromCustomerSession,
  storefrontLoginUrl,
} from "@/lib/auth/panel-access";
import { PanelAccessDenied } from "@/components/auth/PanelAccessDenied";
import { hajiasalPath } from "@/lib/paths";

export default async function SellerLoginPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect(storefrontLoginUrl(hajiasalPath("/seller/dashboard")));
  }

  const seller = await resolveSellerFromCustomerSession(session);
  if (seller) {
    redirect(hajiasalPath("/seller/dashboard"));
  }

  return <PanelAccessDenied panelLabel="پنل فروشنده" />;
}

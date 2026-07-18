import { redirect } from "next/navigation";
import { hajiasalPath } from "@/lib/paths";

export default function SellerEarningsRedirectPage() {
  redirect(hajiasalPath("/seller/wallet"));
}

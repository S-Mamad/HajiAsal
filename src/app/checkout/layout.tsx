import type { Metadata } from "next";
import { hajiasalCanonical } from "@/lib/paths";

export const metadata: Metadata = {
  title: "تکمیل خرید",
  description: "ثبت سفارش و پرداخت امن در فروشگاه حاجی عسل",
  alternates: { canonical: hajiasalCanonical("/checkout") },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

import type { Metadata } from "next";
import { hajiasalCanonical } from "@/lib/paths";

export const metadata: Metadata = {
  title: "سبد خرید",
  description: "بررسی و مدیریت سبد خرید حاجی عسل",
  robots: { index: false, follow: false },
  alternates: { canonical: hajiasalCanonical("/cart") },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

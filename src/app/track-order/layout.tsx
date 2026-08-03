import type { Metadata } from "next";
import { hajiasalCanonical } from "@/lib/paths";

export const metadata: Metadata = {
  title: "پیگیری سفارش",
  description: "وضعیت سفارش حاجی عسل را با کد پیگیری بررسی کنید",
  alternates: { canonical: hajiasalCanonical("/track-order") },
};

export default function TrackOrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

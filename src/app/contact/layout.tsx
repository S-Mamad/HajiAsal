import type { Metadata } from "next";
import { hajiasalCanonical } from "@/lib/paths";

export const metadata: Metadata = {
  title: "تماس با ما",
  description:
    "راه‌های ارتباط با حاجی عسل: تلفن، ایمیل، آدرس و فرم پیام برای پشتیبانی خرید",
  alternates: { canonical: hajiasalCanonical("/contact") },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

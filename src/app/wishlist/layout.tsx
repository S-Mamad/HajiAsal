import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "علاقه‌مندی‌ها",
  description: "لیست محصولات ذخیره‌شده در حاجی عسل",
  robots: { index: false, follow: false },
};

export default function WishlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

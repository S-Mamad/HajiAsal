import type { Metadata } from "next";
import { ShopContent } from "@/components/shop/ShopContent";
import { hajiasalCanonical } from "@/lib/paths";

export const metadata: Metadata = {
  title: "فروشگاه",
  description:
    "لیست کامل محصولات حاجی عسل: عسل کوهستان، آویشن، چهل‌گیاه، ژل رویال، شهد با موم و ست‌های هدیه",
  alternates: { canonical: hajiasalCanonical("/shop") },
};

export default function ShopPage() {
  return <ShopContent />;
}

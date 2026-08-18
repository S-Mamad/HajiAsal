import type { Metadata } from "next";
import { ShopContent } from "@/components/shop/ShopContent";
import { hajiasalCanonical } from "@/lib/paths";
import { getAllCategoriesAsync } from "@/lib/server/categories";

export const metadata: Metadata = {
  title: "فروشگاه",
  description:
    "لیست کامل محصولات حاجی عسل: عسل کوهستان، آویشن، چهل‌گیاه، ژل رویال، شهد با موم و ست‌های هدیه",
  alternates: { canonical: hajiasalCanonical("/shop") },
};

export default async function ShopPage() {
  const categories = await getAllCategoriesAsync();
  return (
    <ShopContent
      categories={categories.map((c) => ({ id: c.id, label: c.name }))}
    />
  );
}

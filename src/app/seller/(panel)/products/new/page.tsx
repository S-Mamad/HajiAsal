"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { SellerProductImageField } from "@/components/seller/ui/SellerProductImageField";
import { hajiasalPath } from "@/lib/paths";

const CATEGORY_OPTIONS = [
  { id: "mountain", label: "کوهستان" },
  { id: "thyme", label: "آویشن" },
  { id: "multifloral", label: "چندگل" },
  { id: "royal-jelly", label: "ژل رویال" },
  { id: "honeycomb", label: "موم عسل" },
  { id: "specialty", label: "ویژه" },
  { id: "gift-set", label: "هدیه" },
  { id: "distillates", label: "عرقیات" },
  { id: "rice", label: "برنج" },
  { id: "saffron", label: "زعفران" },
];

export default function SellerProductNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("specialty");
  const [price, setPrice] = useState("");
  const [grams, setGrams] = useState("1000");
  const [weightLabel, setWeightLabel] = useState("۱ کیلو");
  const [images, setImages] = useState<string[]>([]);
  const [imageFits, setImageFits] = useState<
    Record<string, { scale: number; x: number; y: number }>
  >({});
  const [stockQty, setStockQty] = useState("1");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (asDraft: boolean) => {
    setSaving(true);
    setError("");
    try {
      const cat = CATEGORY_OPTIONS.find((c) => c.id === category);
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortDescription,
          category,
          categoryLabel: cat?.label ?? category,
          images,
          imageFits,
          weightOptions: [
            {
              label: weightLabel,
              grams: Number(grams),
              price: Number(price),
            },
          ],
          stockQty: Number(stockQty) || 0,
          status: asDraft ? "draft" : "active",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      router.push(hajiasalPath(`/seller/products/${data.product.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <Input label="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input label="توضیح کوتاه" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
      <label className="block space-y-1 text-sm">
        <span className="text-stone-600">دسته</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <Input label="قیمت" value={price} onChange={(e) => setPrice(e.target.value)} type="number" />
      <Input label="گرم" value={grams} onChange={(e) => setGrams(e.target.value)} type="number" />
      <Input label="برچسب وزن" value={weightLabel} onChange={(e) => setWeightLabel(e.target.value)} />
      <Input label="موجودی" value={stockQty} onChange={(e) => setStockQty(e.target.value)} type="number" />
      <SellerProductImageField
        images={images}
        imageFits={imageFits}
        onChange={(nextImages, nextFits) => {
          setImages(nextImages);
          setImageFits(nextFits);
        }}
      />
      <div className="flex gap-2">
        <AdminButton onClick={() => void submit(false)} disabled={saving || !title || !price}>
          ثبت و ارسال برای تأیید
        </AdminButton>
        <AdminButton variant="outline" onClick={() => void submit(true)} disabled={saving || !title || !price}>
          پیش‌نویس
        </AdminButton>
      </div>
      <p className="text-xs text-stone-500">
        پس از تأیید ادمین، محصول در فروشگاه نمایش داده می‌شود.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { SellerProductImageField } from "@/components/seller/ui/SellerProductImageField";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

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

export default function SellerProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/seller/products?id=${params.id}`);
    if (!res.ok) {
      router.push(hajiasalPath("/seller/products"));
      return;
    }
    const data = await res.json();
    const next = data.product as Product;
    if (!next?.sellerId) {
      setError("محصول کاتالوگ اختصاصی فقط از موجودی قابل مدیریت است");
      setProduct(null);
      return;
    }
    setProduct(next);
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (extra?: { submitForReview?: boolean }) => {
    if (!product) return;
    setSaving(true);
    setError("");
    const cat = CATEGORY_OPTIONS.find((c) => c.id === product.category);
    const res = await fetch("/api/seller/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        title: product.title,
        shortDescription: product.shortDescription,
        longDescription: product.longDescription,
        category: product.category,
        categoryLabel: cat?.label ?? product.categoryLabel,
        images: product.images,
        weightOptions: product.weightOptions,
        stockQty: product.stockQty,
        inStock: (product.stockQty ?? 0) > 0,
        submitForReview: extra?.submitForReview,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "خطا");
      return;
    }
    router.push(hajiasalPath(`/seller/products/${product.id}`));
  };

  if (!product) {
    return (
      <div className="space-y-2">
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <p className="text-sm text-stone-500">...</p>
      </div>
    );
  }

  const needsSubmit =
    product.approvalStatus === "pending" && !product.submittedAt;

  return (
    <div className="mx-auto max-w-xl space-y-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <Input
        label="عنوان"
        value={product.title}
        onChange={(e) => setProduct({ ...product, title: e.target.value })}
      />
      <Input
        label="توضیح کوتاه"
        value={product.shortDescription}
        onChange={(e) =>
          setProduct({ ...product, shortDescription: e.target.value })
        }
      />
      <label className="block space-y-1 text-sm">
        <span className="text-stone-600">دسته</span>
        <select
          value={product.category}
          onChange={(e) =>
            setProduct({
              ...product,
              category: e.target.value as Product["category"],
            })
          }
          className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="موجودی"
        type="number"
        value={String(product.stockQty ?? 0)}
        onChange={(e) =>
          setProduct({ ...product, stockQty: Number(e.target.value) || 0 })
        }
      />
      <Input
        label="قیمت گزینه اول"
        type="number"
        value={String(product.weightOptions[0]?.price ?? 0)}
        onChange={(e) => {
          const price = Number(e.target.value) || 0;
          const weightOptions = [...product.weightOptions];
          if (weightOptions[0]) {
            weightOptions[0] = { ...weightOptions[0], price };
          }
          setProduct({ ...product, weightOptions });
        }}
      />
      <SellerProductImageField
        images={product.images ?? []}
        onChange={(images) => setProduct({ ...product, images })}
      />
      <div className="flex flex-wrap gap-2">
        <AdminButton disabled={saving} onClick={() => void persist()}>
          ذخیره
        </AdminButton>
        {needsSubmit || product.approvalStatus === "rejected" ? (
          <AdminButton
            variant="outline"
            disabled={saving}
            onClick={() => void persist({ submitForReview: true })}
          >
            ارسال برای تأیید
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}

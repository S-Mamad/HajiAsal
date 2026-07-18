"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

export default function SellerProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/seller/products?id=${params.id}`);
    if (!res.ok) {
      router.push(hajiasalPath("/seller/products"));
      return;
    }
    const data = await res.json();
    setProduct(data.product);
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!product) return;
    setError("");
    const res = await fetch("/api/seller/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        title: product.title,
        shortDescription: product.shortDescription,
        longDescription: product.longDescription,
        category: product.category,
        images: product.images,
        weightOptions: product.weightOptions,
        stockQty: product.stockQty,
        status: product.status,
        inStock: (product.stockQty ?? 0) > 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "خطا");
      return;
    }
    router.push(hajiasalPath(`/seller/products/${product.id}`));
  };

  if (!product) return <p className="text-sm text-stone-500">...</p>;

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
      <AdminButton onClick={() => void save()}>ذخیره</AdminButton>
    </div>
  );
}

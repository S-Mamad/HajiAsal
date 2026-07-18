"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

export default function SellerProductViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/seller/products?id=${params.id}`);
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
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

  if (!product) return <p className="text-sm text-stone-500">...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <AdminButton
          variant="outline"
          onClick={() =>
            router.push(hajiasalPath(`/seller/products/${product.id}/edit`))
          }
        >
          ویرایش
        </AdminButton>
        <AdminButton
          variant="outline"
          onClick={() => router.push(hajiasalPath("/seller/products"))}
        >
          بازگشت
        </AdminButton>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="text-xl font-semibold">{product.title}</h3>
        <p className="mt-2 text-sm text-stone-600">{product.shortDescription}</p>
        <p className="mt-3 text-sm">
          وضعیت تأیید: {product.approvalStatus} · موجودی:{" "}
          {product.stockQty ?? (product.inStock ? 1 : 0)} · انتشار:{" "}
          {product.status ?? "active"}
        </p>
        <ul className="mt-3 text-sm">
          {product.weightOptions.map((w) => (
            <li key={w.label}>
              {w.label}: {w.price.toLocaleString("fa-IR")} تومان
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

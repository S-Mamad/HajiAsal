"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductFormShell } from "@/components/admin/products/ProductFormShell";
import { hajiasalPath } from "@/lib/paths";
import type { Product } from "@/types";

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  const fetchProduct = useCallback(async (): Promise<Product | null> => {
    const res = await fetch(`/api/admin/products/${id}`, {
      credentials: "include",
    });
    if (res.status === 401) {
      router.push(hajiasalPath("/admin"));
      return null;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "محصول یافت نشد");
    return data.product as Product;
  }, [id, router]);

  useEffect(() => {
    let cancelled = false;
    void fetchProduct()
      .then((next) => {
        if (cancelled) return;
        if (!next) {
          setError("محصول یافت نشد");
          return;
        }
        setProduct(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "خطا در بارگذاری محصول");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchProduct]);

  if (loading) {
    return <p className="text-sm text-stone-500">در حال بارگذاری...</p>;
  }

  if (error || !product) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || "محصول یافت نشد"}
      </div>
    );
  }

  return (
    <ProductFormShell
      mode="edit"
      productId={id}
      initialProduct={product}
    />
  );
}

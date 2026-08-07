"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product, WeightOption } from "@/types";
import { getEffectiveWeightPrice } from "@/lib/products";
import {
  isProductPurchasable,
  maxPurchasableQty,
} from "@/lib/product-availability";
import { useCartStore } from "@/store/cart";

interface UseProductPurchaseOptions {
  initialProduct: Product;
}

export function useProductPurchase({
  initialProduct,
}: UseProductPurchaseOptions) {
  const addItem = useCartStore((s) => s.addItem);
  const setAnnouncement = useCartStore((s) => s.setAnnouncement);

  const [product, setProduct] = useState(initialProduct);
  const [selectedWeight, setSelectedWeight] = useState<WeightOption>(
    initialProduct.weightOptions[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [addedFlash, setAddedFlash] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/products/${encodeURIComponent(initialProduct.slug)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { product?: Product };
      })
      .then((data) => {
        if (cancelled || !data?.product) return;
        const next = data.product;
        setProduct(next);
        setSelectedWeight((prev) => {
          const match = next.weightOptions.find((w) => w.grams === prev.grams);
          return match ?? next.weightOptions[0];
        });
      })
      .catch(() => {
        /* keep SSR product */
      });
    return () => {
      cancelled = true;
    };
  }, [initialProduct.slug]);

  const listPrice = selectedWeight.price;
  const salePrice = getEffectiveWeightPrice(product, selectedWeight);
  const purchasable = isProductPurchasable(product);
  const maxQty = maxPurchasableQty(product);

  useEffect(() => {
    if (!purchasable) {
      setQuantity(1);
      return;
    }
    setQuantity((q) => Math.min(q, maxQty || 1));
  }, [purchasable, maxQty]);

  const handleAddToCart = useCallback(async () => {
    if (!purchasable || adding) return;
    setAdding(true);
    try {
      const res = await fetch("/api/cart/validate-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          cartQuantity: useCartStore
            .getState()
            .items.filter((i) => i.productId === product.id)
            .reduce((sum, i) => sum + i.quantity, 0),
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        stockQty?: number;
        inStock?: boolean;
      };

      if (!res.ok || !data.success) {
        if (data.inStock === false || (data.stockQty ?? 1) <= 0) {
          setProduct((p) => ({
            ...p,
            inStock: false,
            stockQty: data.stockQty ?? 0,
          }));
        }
        setAnnouncement(data.message ?? "امکان افزودن به سبد وجود ندارد");
        return;
      }

      if (typeof data.stockQty === "number") {
        setProduct((p) => ({
          ...p,
          inStock: true,
          stockQty: data.stockQty,
        }));
      }

      const ok = addItem(
        {
          productId: product.id,
          slug: product.slug,
          title: product.title,
          image: product.images[0],
          weight: {
            ...selectedWeight,
            price: salePrice,
          },
          inStock: true,
          stockQty:
            typeof data.stockQty === "number"
              ? data.stockQty
              : product.stockQty,
        },
        quantity,
      );
      if (!ok) return;
      setAddedFlash(true);
      window.setTimeout(() => setAddedFlash(false), 1200);
    } catch {
      setAnnouncement("خطا در بررسی موجودی محصول");
    } finally {
      setAdding(false);
    }
  }, [
    purchasable,
    adding,
    product,
    quantity,
    selectedWeight,
    salePrice,
    addItem,
    setAnnouncement,
  ]);

  return {
    product,
    selectedWeight,
    setSelectedWeight,
    quantity,
    setQuantity,
    listPrice,
    salePrice,
    purchasable,
    maxQty,
    adding,
    addedFlash,
    handleAddToCart,
  };
}

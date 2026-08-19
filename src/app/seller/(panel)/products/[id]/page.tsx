"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { FramedProductImage } from "@/components/product/media/FramedProductImage";
import { hajiasalPath } from "@/lib/paths";
import { imageFitForSrc } from "@/lib/product-image";
import type { Product, ProductApprovalStatus } from "@/types";

const APPROVAL_LABELS: Record<ProductApprovalStatus, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده",
};

const STATUS_LABELS: Record<string, string> = {
  active: "فعال",
  draft: "پیش‌نویس",
  archived: "بایگانی",
  disabled: "غیرفعال",
};

export default function SellerProductViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const submitForReview = async () => {
    if (!product) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          submitForReview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setProduct(data.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  if (!product) return <p className="text-sm text-stone-500">...</p>;

  const approval = product.approvalStatus ?? "pending";
  const needsSubmit = approval === "pending" && !product.submittedAt;
  const canResubmit = approval === "rejected" || needsSubmit;

  const owned = Boolean(product.sellerId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {owned ? (
          <AdminButton
            variant="outline"
            onClick={() =>
              router.push(hajiasalPath(`/seller/products/${product.id}/edit`))
            }
          >
            ویرایش
          </AdminButton>
        ) : null}
        {owned && canResubmit ? (
          <AdminButton disabled={busy} onClick={() => void submitForReview()}>
            {busy ? "در حال ارسال..." : "ارسال برای تأیید"}
          </AdminButton>
        ) : null}
        <AdminButton
          variant="outline"
          onClick={() => router.push(hajiasalPath("/seller/products"))}
        >
          بازگشت
        </AdminButton>
      </div>
      {!owned ? (
        <p className="text-sm text-amber-800">
          این محصول از کاتالوگ اختصاصی است؛ فقط موجودی از بخش انبار قابل تغییر است.
        </p>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        {product.images?.[0] ? (
          <FramedProductImage
            src={product.images[0]}
            alt={product.title}
            imageFit={imageFitForSrc(product.imageFits, product.images[0])}
            sizes="160px"
            className="mb-3 h-40 w-40 rounded-lg"
            aspectClassName="relative h-full w-full overflow-hidden"
          />
        ) : null}
        <h3 className="text-xl font-semibold">{product.title}</h3>
        <p className="mt-2 text-sm text-stone-600">{product.shortDescription}</p>
        <p className="mt-3 text-sm">
          وضعیت تأیید: {APPROVAL_LABELS[approval]}
          {needsSubmit ? " (پیش‌نویس؛ هنوز ارسال نشده)" : ""}
          {" · "}
          موجودی: {product.stockQty ?? (product.inStock ? 1 : 0)}
          {" · "}
          انتشار: {STATUS_LABELS[product.status ?? "draft"] ?? product.status}
        </p>
        {product.reviewNote ? (
          <p className="mt-2 text-sm text-amber-800">
            یادداشت ادمین: {product.reviewNote}
          </p>
        ) : null}
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

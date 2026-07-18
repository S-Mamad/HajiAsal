"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";
import type { Product, ProductApprovalStatus } from "@/types";

const APPROVAL_LABELS: Record<ProductApprovalStatus, string> = {
  pending: "در انتظار تأیید ادمین",
  approved: "تأیید شده",
  rejected: "رد شده",
};

const APPROVAL_STYLES: Record<ProductApprovalStatus, string> = {
  pending: "text-amber-700",
  approved: "text-emerald-700",
  rejected: "text-rose-700",
};

export default function SellerProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("specialty");
  const [categoryLabel, setCategoryLabel] = useState("تخصصی");
  const [price, setPrice] = useState("");
  const [weightLabel, setWeightLabel] = useState("۱ کیلو");
  const [grams, setGrams] = useState("1000");
  const [imageUrl, setImageUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/products");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setProducts(data.products ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const createProduct = async () => {
    if (!title.trim() || !price) {
      setError("عنوان و قیمت الزامی است");
      return;
    }
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortDescription,
          category,
          categoryLabel,
          images: imageUrl.trim() ? [imageUrl.trim()] : [],
          weightOptions: [
            {
              label: weightLabel || "۱ کیلو",
              grams: Number(grams) || 1000,
              price: Number(price),
            },
          ],
          inStock: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ایجاد محصول ناموفق بود");
      setTitle("");
      setShortDescription("");
      setPrice("");
      setImageUrl("");
      setMessage(data.message ?? "محصول ثبت شد");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setCreating(false);
    }
  };

  const toggleStock = async (product: Product) => {
    setTogglingId(product.id);
    setError("");
    try {
      const res = await fetch("/api/seller/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          inStock: !product.inStock,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "به‌روزرسانی موجودی ممکن نشد");
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, inStock: !product.inStock } : p,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <AdminButton
          href={hajiasalPath("/seller/products/new")}
          className="!bg-amber-800 hover:!bg-amber-900"
        >
          افزودن محصول
        </AdminButton>
        <AdminButton variant="outline" onClick={() => void load()}>
          بروزرسانی
        </AdminButton>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="mb-1 text-sm font-medium text-stone-800">
          افزودن سریع
        </p>
        <p className="mb-3 text-xs text-stone-500">
          هر محصول بعد از ثبت، تا تأیید ادمین در فروشگاه عمومی نمایش داده
          نمی‌شود. ویرایش محتوا هم دوباره نیاز به تأیید دارد.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            placeholder="عنوان محصول"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="توضیح کوتاه"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
          <Input
            placeholder="دسته (انگلیسی)"
            dir="ltr"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Input
            placeholder="برچسب دسته"
            value={categoryLabel}
            onChange={(e) => setCategoryLabel(e.target.value)}
          />
          <Input
            placeholder="برچسب وزن"
            value={weightLabel}
            onChange={(e) => setWeightLabel(e.target.value)}
          />
          <Input
            placeholder="گرم"
            dir="ltr"
            type="number"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          <Input
            placeholder="قیمت (تومان)"
            dir="ltr"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            placeholder="آدرس تصویر (اختیاری)"
            dir="ltr"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <AdminButton
            type="button"
            disabled={creating}
            onClick={() => void createProduct()}
            className="!bg-amber-800 hover:!bg-amber-900"
          >
            {creating ? "در حال ثبت..." : "ثبت محصول برای تأیید"}
          </AdminButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          کاتالوگ فروشگاه شما ({products.length.toLocaleString("fa-IR")} محصول)
        </p>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            type="button"
            variant="outline"
            onClick={() => router.push(hajiasalPath("/seller/inventory"))}
            className="!border-stone-300"
          >
            صفحه موجودی
          </AdminButton>
          <AdminButton
            type="button"
            variant="outline"
            onClick={() => void load()}
            className="!border-stone-300"
          >
            بروزرسانی
          </AdminButton>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {loading ? (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      ) : null}

      <DataTable
        data={products}
        rowKey={(p) => p.id}
        emptyMessage="هنوز محصولی ثبت نکرده‌اید"
        minWidth={false}
        className="!border-stone-200"
        columns={[
          {
            key: "title",
            header: "محصول",
            render: (p) => (
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-stone-400">{p.categoryLabel}</p>
              </div>
            ),
          },
          {
            key: "approval",
            header: "تأیید",
            render: (p) => {
              const st = p.approvalStatus ?? "approved";
              return (
                <span className={`text-xs font-medium ${APPROVAL_STYLES[st]}`}>
                  {APPROVAL_LABELS[st]}
                </span>
              );
            },
          },
          {
            key: "price",
            header: "شروع قیمت",
            render: (p) => {
              const prices = p.weightOptions?.map((w) => w.price) ?? [];
              if (prices.length === 0) return "نامشخص";
              return `${Math.min(...prices).toLocaleString("fa-IR")} تومان`;
            },
          },
          {
            key: "stock",
            header: "موجودی",
            render: (p) => (
              <AdminButton
                type="button"
                size="sm"
                variant="outline"
                disabled={togglingId === p.id}
                onClick={() => void toggleStock(p)}
                className={
                  p.inStock
                    ? "!border-emerald-300 !text-emerald-800"
                    : "!border-red-300 !text-red-700"
                }
              >
                {togglingId === p.id
                  ? "..."
                  : p.inStock
                    ? "موجود"
                    : "ناموجود"}
              </AdminButton>
            ),
          },
          {
            key: "link",
            header: "",
            render: (p) =>
              (p.approvalStatus ?? "approved") === "approved" ? (
                <Link
                  href={hajiasalPath(`/product/${p.slug}`)}
                  className="text-xs text-amber-800 hover:underline"
                  target="_blank"
                >
                  مشاهده
                </Link>
              ) : (
                <span className="text-xs text-stone-400">منتشر نشده</span>
              ),
          },
        ]}
      />
    </div>
  );
}

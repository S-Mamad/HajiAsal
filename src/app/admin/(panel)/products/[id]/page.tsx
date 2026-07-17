"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";
import type { Product, WeightOption } from "@/types";

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [imagesText, setImagesText] = useState("");
  const [weightJson, setWeightJson] = useState("[]");
  const [inStock, setInStock] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      if (!res.ok) {
        setError("محصول یافت نشد");
        return;
      }
      const data = await res.json();
      const p = data.product as Product;
      setTitle(p.title);
      setSlug(p.slug);
      setShortDescription(p.shortDescription);
      setLongDescription(p.longDescription);
      setImagesText((p.images ?? []).join("\n"));
      setWeightJson(JSON.stringify(p.weightOptions ?? [], null, 2));
      setInStock(p.inStock);
      setIsBestseller(Boolean(p.isBestseller));
      setIsNew(Boolean(p.isNew));
    } catch {
      setError("خطا در بارگذاری محصول");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      let weightOptions: WeightOption[];
      try {
        weightOptions = JSON.parse(weightJson) as WeightOption[];
      } catch {
        throw new Error("فرمت وزن‌ها (JSON) نامعتبر است");
      }

      const images = imagesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          shortDescription,
          longDescription,
          images,
          weightOptions,
          inStock,
          isBestseller,
          isNew,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      router.push(hajiasalPath("/admin/products"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">در حال بارگذاری...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-end">
        <Link
          href={hajiasalPath("/admin/products")}
          className="text-sm text-sky-700 hover:underline"
        >
          بازگشت به لیست
        </Link>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <label className="block space-y-1">
          <span className="text-sm font-medium">عنوان</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">slug</span>
          <Input
            dir="ltr"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">توضیح کوتاه</span>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={2}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">توضیح کامل</span>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            rows={5}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">تصاویر (هر خط یک URL)</span>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            dir="ltr"
            rows={4}
            value={imagesText}
            onChange={(e) => setImagesText(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">وزن‌ها (JSON)</span>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            dir="ltr"
            rows={8}
            value={weightJson}
            onChange={(e) => setWeightJson(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            موجود
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isBestseller}
              onChange={(e) => setIsBestseller(e.target.checked)}
            />
            پرفروش
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
            />
            جدید
          </label>
        </div>
        <AdminButton type="button" onClick={() => void save()} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </AdminButton>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  AdminInput,
  AdminTextarea,
  FormField,
} from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { hajiasalPath } from "@/lib/paths";

export default function AdminProductCreatePage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [price, setPrice] = useState("450000");
  const [category, setCategory] = useState("natural");

  const submit = async () => {
    setSaving(true);
    try {
      const id = `p_${slug || Date.now()}`;
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id,
          slug: slug || id,
          title,
          shortDescription,
          longDescription,
          category,
          categoryLabel: category,
          images: [],
          weightOptions: [
            { label: "۱ کیلو", grams: 1000, price: Number(price) || 0 },
          ],
          inStock: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ایجاد");
      toast.success("محصول ایجاد شد");
      router.push(hajiasalPath(`/admin/products/${data.product?.id ?? id}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-stone-900">افزودن محصول</h3>
      <FormField label="نام" required>
        <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField label="اسلاگ" required tooltip="آدرس یکتای محصول در فروشگاه">
        <AdminInput
          dir="ltr"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
      </FormField>
      <FormField label="دسته (id)">
        <AdminInput value={category} onChange={(e) => setCategory(e.target.value)} />
      </FormField>
      <FormField label="قیمت پایه (تومان)">
        <AdminInput
          dir="ltr"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </FormField>
      <FormField label="توضیح کوتاه">
        <AdminTextarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />
      </FormField>
      <FormField label="توضیح کامل">
        <AdminTextarea
          value={longDescription}
          onChange={(e) => setLongDescription(e.target.value)}
        />
      </FormField>
      <div className="flex gap-2">
        <AdminButton disabled={saving || !title || !slug} onClick={() => void submit()}>
          {saving ? "..." : "ایجاد"}
        </AdminButton>
        <AdminButton
          variant="outline"
          href={hajiasalPath("/admin/products")}
        >
          انصراف
        </AdminButton>
      </div>
    </div>
  );
}

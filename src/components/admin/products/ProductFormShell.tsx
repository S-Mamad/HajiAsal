"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ClockCounterClockwise, Eye, FloppyDisk } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import type {
  Product,
  ProductFieldDefinition,
  ProductStatus,
  WeightOption,
} from "@/types";
import {
  ProductFormTabs,
  type ProductFormTabId,
} from "./ProductFormTabs";
import { SeoPreviewPanel } from "./SeoPreviewPanel";
import { MediaDropzone } from "./MediaDropzone";
import { AutosaveIndicator, type AutosaveState } from "./AutosaveIndicator";
import { RevisionsDrawer } from "./RevisionsDrawer";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";

const formSchema = z.object({
  title: z.string().min(1, "عنوان الزامی است"),
  slug: z.string().min(1, "اسلاگ الزامی است"),
  shortDescription: z.string().default(""),
  longDescription: z.string().default(""),
  category: z.string().min(1),
  categoryLabel: z.string().default(""),
  images: z.array(z.string()).default([]),
  weightOptions: z
    .array(
      z.object({
        label: z.string().min(1),
        grams: z.coerce.number().positive(),
        price: z.coerce.number().nonnegative(),
      }),
    )
    .min(1, "حداقل یک گزینه وزن لازم است"),
  discountPrice: z.coerce.number().optional().or(z.literal("")),
  inStock: z.boolean().default(true),
  stockQty: z.coerce.number().optional().or(z.literal("")),
  isBestseller: z.boolean().default(false),
  isNew: z.boolean().default(false),
  ingredients: z.string().optional(),
  shippingInfo: z.string().optional(),
  sku: z.string().optional(),
  brandId: z.string().optional(),
  status: z.enum(["active", "draft", "archived", "disabled"]).default("draft"),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      canonical: z.string().optional(),
      ogTitle: z.string().optional(),
      ogDescription: z.string().optional(),
      ogImage: z.string().optional(),
      twitterTitle: z.string().optional(),
      twitterDescription: z.string().optional(),
      twitterImage: z.string().optional(),
      robots: z.string().optional(),
      focusKeyword: z.string().optional(),
    })
    .default({}),
  customFields: z.record(z.string(), z.unknown()).default({}),
});

export type ProductFormValues = z.infer<typeof formSchema>;

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

function toFormValues(product?: Product | null): ProductFormValues {
  if (!product) {
    return {
      title: "",
      slug: "",
      shortDescription: "",
      longDescription: "",
      category: "mountain",
      categoryLabel: "کوهستان",
      images: [],
      weightOptions: [{ label: "۱ کیلوگرم", grams: 1000, price: 0 }],
      discountPrice: "",
      inStock: true,
      stockQty: "",
      isBestseller: false,
      isNew: false,
      ingredients: "",
      shippingInfo: "",
      sku: "",
      brandId: "",
      status: "draft",
      seo: {},
      customFields: {},
    };
  }
  return {
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription ?? "",
    longDescription: product.longDescription ?? "",
    category: product.category,
    categoryLabel: product.categoryLabel,
    images: product.images ?? [],
    weightOptions: product.weightOptions?.length
      ? product.weightOptions
      : [{ label: "۱ کیلوگرم", grams: 1000, price: 0 }],
    discountPrice: product.discountPrice ?? "",
    inStock: product.inStock,
    stockQty: product.stockQty ?? "",
    isBestseller: Boolean(product.isBestseller),
    isNew: Boolean(product.isNew),
    ingredients: product.ingredients ?? "",
    shippingInfo: product.shippingInfo ?? "",
    sku: product.sku ?? "",
    brandId: product.brandId ?? "",
    status: (product.status as ProductStatus) ?? "active",
    seo: product.seo ?? {},
    customFields: product.customFields ?? {},
  };
}

export function ProductFormShell({
  mode,
  productId,
  initialProduct,
}: {
  mode: "create" | "edit";
  productId?: string;
  initialProduct?: Product | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<ProductFormTabId>("basic");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [fields, setFields] = useState<ProductFieldDefinition[]>([]);
  const lastSaved = useRef("");

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema as any),
    defaultValues: toFormValues(initialProduct),
  });

  const { fields: weightFields, append, remove } = useFieldArray({
    control: form.control,
    name: "weightOptions",
  });

  const watched = useWatch({ control: form.control });
  const values = useMemo(
    () => ({ ...toFormValues(initialProduct), ...watched }),
    [initialProduct, watched],
  );

  useEffect(() => {
    void fetch(
      `/api/admin/product-fields?categoryId=${encodeURIComponent(values.category || "")}`,
      { credentials: "include" },
    )
      .then((r) => r.json())
      .then((d) => setFields(d.fields ?? []))
      .catch(() => setFields([]));
  }, [values.category]);

  const buildPayload = useCallback((data: ProductFormValues, extras?: { autosave?: boolean; status?: ProductStatus }) => {
    const discount =
      data.discountPrice === "" || data.discountPrice == null
        ? undefined
        : Number(data.discountPrice);
    const stockQty =
      data.stockQty === "" || data.stockQty == null
        ? undefined
        : Number(data.stockQty);
    return {
      title: data.title,
      slug: data.slug,
      shortDescription: data.shortDescription,
      longDescription: data.longDescription,
      category: data.category,
      categoryLabel:
        data.categoryLabel ||
        CATEGORY_OPTIONS.find((c) => c.id === data.category)?.label ||
        data.category,
      images: data.images,
      weightOptions: data.weightOptions as WeightOption[],
      discountPrice: discount,
      inStock: data.inStock,
      stockQty,
      isBestseller: data.isBestseller,
      isNew: data.isNew,
      ingredients: data.ingredients,
      shippingInfo: data.shippingInfo,
      sku: data.sku || undefined,
      brandId: data.brandId || null,
      status: extras?.status ?? data.status,
      seo: data.seo,
      customFields: data.customFields,
      autosave: extras?.autosave,
    };
  }, []);

  const persist = useCallback(
    async (
      data: ProductFormValues,
      opts?: { autosave?: boolean; status?: ProductStatus; redirect?: boolean },
    ) => {
      setError("");
      const payload = buildPayload(data, opts);

      if (mode === "create") {
        setSaving(true);
        try {
          const res = await fetch("/api/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "خطا در ایجاد");
          router.push(hajiasalPath(`/admin/products/${json.product.id}`));
        } catch (err) {
          setError(err instanceof Error ? err.message : "خطا");
        } finally {
          setSaving(false);
        }
        return;
      }

      if (!productId) return;
      if (opts?.autosave) setAutosave("saving");
      else setSaving(true);

      try {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "خطا در ذخیره");
        lastSaved.current = JSON.stringify(payload);
        if (opts?.autosave) setAutosave("saved");
        if (opts?.redirect) router.push(hajiasalPath("/admin/products"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا");
        if (opts?.autosave) setAutosave("error");
      } finally {
        setSaving(false);
      }
    },
    [buildPayload, mode, productId, router],
  );

  useEffect(() => {
    if (mode !== "edit" || !productId) return;
    const timer = setTimeout(() => {
      const data = form.getValues();
      const payload = buildPayload(data, { autosave: true });
      const serialized = JSON.stringify(payload);
      if (!lastSaved.current) {
        lastSaved.current = serialized;
        return;
      }
      if (serialized === lastSaved.current) return;
      void persist(data, { autosave: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [values, mode, productId, form, buildPayload, persist]);

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    void form.handleSubmit((data) =>
      persist(data, {
        redirect: true,
        status: data.status === "draft" ? "active" : data.status,
      }),
    )(event);
  };

  const tabPanel = useMemo(() => {
    switch (tab) {
      case "basic":
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="عنوان" {...form.register("title")} error={form.formState.errors.title?.message} />
            <Input label="اسلاگ" {...form.register("slug")} error={form.formState.errors.slug?.message} />
            <div className="md:col-span-2">
              <Input label="توضیح کوتاه" {...form.register("shortDescription")} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">توضیح کامل</label>
              <textarea
                className="min-h-36 rounded-xl border border-stone-200 px-3 py-2 text-sm"
                {...form.register("longDescription")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">دسته‌بندی</label>
              <select
                className="h-11 rounded-xl border border-stone-200 px-3 text-sm"
                {...form.register("category")}
                onChange={(e) => {
                  form.setValue("category", e.target.value);
                  const label =
                    CATEGORY_OPTIONS.find((c) => c.id === e.target.value)?.label ??
                    e.target.value;
                  form.setValue("categoryLabel", label);
                }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">وضعیت</label>
              <select
                className="h-11 rounded-xl border border-stone-200 px-3 text-sm"
                {...form.register("status")}
              >
                <option value="draft">پیش‌نویس</option>
                <option value="active">فعال / منتشر</option>
                <option value="archived">آرشیو</option>
                <option value="disabled">غیرفعال</option>
              </select>
            </div>
            <Input label="SKU" {...form.register("sku")} />
            <Input label="شناسه برند" {...form.register("brandId")} />
          </div>
        );
      case "pricing":
        return (
          <div className="space-y-4">
            <Input label="قیمت تخفیف‌خورده (اختیاری)" type="number" {...form.register("discountPrice")} />
            <p className="text-xs text-stone-500">
              قیمت اصلی از گزینه‌های وزن در تب «تنوع وزن» گرفته می‌شود.
            </p>
          </div>
        );
      case "inventory":
        return (
          <div className="space-y-3">
            <Input label="تعداد موجودی" type="number" {...form.register("stockQty")} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("inStock")} />
              موجود در انبار
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("isBestseller")} />
              پرفروش
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("isNew")} />
              محصول جدید
            </label>
          </div>
        );
      case "variations":
        return (
          <div className="space-y-3">
            {weightFields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-2 rounded-xl border border-stone-200 p-3 md:grid-cols-4"
              >
                <Input label="برچسب" {...form.register(`weightOptions.${index}.label`)} />
                <Input label="گرم" type="number" {...form.register(`weightOptions.${index}.grams`)} />
                <Input label="قیمت" type="number" {...form.register(`weightOptions.${index}.price`)} />
                <div className="flex items-end">
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={weightFields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    حذف
                  </AdminButton>
                </div>
              </div>
            ))}
            <AdminButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ label: "گزینه جدید", grams: 500, price: 0 })}
            >
              افزودن وزن
            </AdminButton>
          </div>
        );
      case "media":
        return (
          <Controller
            control={form.control}
            name="images"
            render={({ field }) => (
              <MediaDropzone images={field.value} onChange={field.onChange} />
            )}
          />
        );
      case "seo":
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Input label="SEO Title" {...form.register("seo.title")} />
              <Input label="SEO Description" {...form.register("seo.description")} />
              <Input label="Canonical URL" {...form.register("seo.canonical")} />
              <Input label="Focus Keyword" {...form.register("seo.focusKeyword")} />
              <Input label="OG Title" {...form.register("seo.ogTitle")} />
              <Input label="OG Description" {...form.register("seo.ogDescription")} />
              <Input label="OG Image" {...form.register("seo.ogImage")} />
              <Input label="Twitter Title" {...form.register("seo.twitterTitle")} />
              <Input label="Twitter Description" {...form.register("seo.twitterDescription")} />
              <Input label="Twitter Image" {...form.register("seo.twitterImage")} />
              <Input label="Robots" {...form.register("seo.robots")} placeholder="index,follow" />
            </div>
            <SeoPreviewPanel
              title={values.title}
              slug={values.slug}
              shortDescription={values.shortDescription}
              images={values.images}
              seo={values.seo}
            />
          </div>
        );
      case "custom":
        return (
          <Controller
            control={form.control}
            name="customFields"
            render={({ field }) => (
              <DynamicFieldRenderer
                fields={fields}
                values={field.value ?? {}}
                onChange={field.onChange}
              />
            )}
          />
        );
      case "advanced":
        return (
          <div className="space-y-4">
            <Input label="مواد تشکیل‌دهنده" {...form.register("ingredients")} />
            <Input label="اطلاعات ارسال" {...form.register("shippingInfo")} />
          </div>
        );
      default:
        return null;
    }
  }, [tab, form, weightFields, append, remove, values, fields]);

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            {mode === "create" ? "محصول جدید" : "ویرایش محصول"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            مدیریت کامل اطلاعات، سئو، رسانه و فیلدهای سفارشی
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "edit" ? <AutosaveIndicator state={autosave} /> : null}
          {mode === "edit" && productId ? (
            <>
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRevisionsOpen(true)}
              >
                <Icon icon={ClockCounterClockwise} size={16} />
                تاریخچه
              </AdminButton>
              <AdminButton
                href={hajiasalPath(`/product/${values.slug}`)}
                variant="ghost"
                size="sm"
                target="_blank"
                external
              >
                <Icon icon={Eye} size={16} />
                مشاهده
              </AdminButton>
            </>
          ) : null}
          <AdminButton
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() =>
              void persist(form.getValues(), { status: "draft", redirect: false })
            }
          >
            پیش‌نویس
          </AdminButton>
          <AdminButton type="submit" disabled={saving}>
            <Icon icon={FloppyDisk} size={16} />
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </AdminButton>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <ProductFormTabs active={tab} onChange={setTab} />

      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        {tabPanel}
      </div>

      {mode === "edit" && productId ? (
        <RevisionsDrawer
          key={revisionsOpen ? productId : "closed"}
          productId={productId}
          open={revisionsOpen}
          onClose={() => setRevisionsOpen(false)}
          onRestored={() => router.refresh()}
        />
      ) : null}
    </form>
  );
}

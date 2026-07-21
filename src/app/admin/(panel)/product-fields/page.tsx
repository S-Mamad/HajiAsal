"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import type { CustomFieldType, ProductFieldDefinition } from "@/types";

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "متن" },
  { value: "number", label: "عدد" },
  { value: "date", label: "تاریخ" },
  { value: "select", label: "انتخابی" },
  { value: "image", label: "تصویر" },
  { value: "table", label: "جدول" },
  { value: "repeater", label: "تکرارشونده" },
];

export default function AdminProductFieldsPage() {
  const toast = useAdminToast();
  const [fields, setFields] = useState<ProductFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");
  const [choices, setChoices] = useState("");
  const [columns, setColumns] = useState("");

  const fetchFields = useCallback(async (): Promise<ProductFieldDefinition[]> => {
    const res = await fetch("/api/admin/product-fields", {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "خطا");
    return data.fields ?? [];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setFields(await fetchFields());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [fetchFields, toast]);

  useEffect(() => {
    let cancelled = false;
    void fetchFields()
      .then((items) => {
        if (!cancelled) setFields(items);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "خطا");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchFields, toast]);

  const createField = async () => {
    try {
      const options =
        type === "select"
          ? { choices: choices.split(",").map((s) => s.trim()).filter(Boolean) }
          : type === "table"
            ? {
                columns: columns.split(",").map((s) => s.trim()).filter(Boolean),
              }
            : undefined;

      const res = await fetch("/api/admin/product-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          key,
          label,
          type,
          scope: "product",
          sortOrder: fields.length,
          isRequired: false,
          options,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("فیلد ایجاد شد");
      setKey("");
      setLabel("");
      setChoices("");
      setColumns("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };

  const removeField = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/product-fields?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("فیلد حذف شد");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">
          فیلدهای سفارشی محصول
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          تعریف فیلدهای داینامیک برای فرم محصولات
        </p>
      </div>

      <Can permission="products.manage_fields">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-medium text-stone-800">فیلد جدید</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="کلید (key)" value={key} onChange={(e) => setKey(e.target.value)} placeholder="origin_region" />
            <Input label="برچسب" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="منطقه برداشت" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-stone-700">نوع</label>
              <select
                className="h-11 rounded-xl border border-stone-200 px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as CustomFieldType)}
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {type === "select" ? (
              <Input
                label="گزینه‌ها (با کاما)"
                value={choices}
                onChange={(e) => setChoices(e.target.value)}
                placeholder="گزینه۱,گزینه۲"
              />
            ) : null}
            {type === "table" ? (
              <Input
                label="ستون‌ها (با کاما)"
                value={columns}
                onChange={(e) => setColumns(e.target.value)}
                placeholder="ستون۱,ستون۲"
              />
            ) : null}
          </div>
          <AdminButton onClick={() => void createField()} disabled={!key || !label}>
            افزودن فیلد
          </AdminButton>
        </div>
      </Can>

      <div className="rounded-2xl border border-stone-200 bg-white">
        {loading ? (
          <p className="p-4 text-sm text-stone-500">در حال بارگذاری...</p>
        ) : fields.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">فیلدی تعریف نشده.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {fields.map((field) => (
              <li
                key={field.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-stone-900">{field.label}</p>
                  <p className="text-xs text-stone-500">
                    {field.key} · {field.type} · {field.scope}
                  </p>
                </div>
                <Can permission="products.manage_fields">
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeField(field.id)}
                  >
                    حذف
                  </AdminButton>
                </Can>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

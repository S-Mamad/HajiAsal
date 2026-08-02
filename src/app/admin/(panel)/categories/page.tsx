"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminForm";
import { hajiasalPath } from "@/lib/paths";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setCategories(data.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!name.trim() || !slug.trim()) {
      setError("نام و slug الزامی است");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: slug.trim(),
          slug: slug.trim(),
          name: name.trim(),
          sortOrder: categories.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            data.message ??
            "ذخیره نشد. برای مدیریت دسته‌ها اتصال پایگاه‌داده لازم است.",
        );
      }
      setName("");
      setSlug("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="panel-card flex flex-wrap gap-2 p-4">
        <AdminInput
          placeholder="نام دسته"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <AdminInput
          placeholder="slug"
          dir="ltr"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="max-w-xs"
        />
        <AdminButton
          type="button"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "در حال ذخیره..." : "افزودن دسته"}
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <DataTable
        data={categories}
        rowKey={(r) => r.id}
        emptyMessage="دسته‌ای یافت نشد"
        loading={loading}
        error={error || null}
        onRetry={() => void load()}
        columns={[
          {
            key: "name",
            header: "نام",
            sortable: true,
            getSortValue: (r) => r.name,
            render: (r) => r.name,
          },
          {
            key: "slug",
            header: "slug",
            sortable: true,
            getSortValue: (r) => r.slug,
            render: (r) => (
              <span dir="ltr" className="font-mono text-xs">
                {r.slug}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

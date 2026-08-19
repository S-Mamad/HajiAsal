"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  FormField,
} from "@/components/admin/ui/AdminForm";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { hajiasalPath } from "@/lib/paths";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  showOnHome?: boolean;
  homeLabel?: string;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [showOnHome, setShowOnHome] = useState(true);
  const [homeLabel, setHomeLabel] = useState("");
  const [sortOrderInput, setSortOrderInput] = useState("0");
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [deleteHint, setDeleteHint] = useState("");

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

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setDescription("");
    setImage("");
    setShowOnHome(true);
    setHomeLabel("");
    setSortOrderInput(String(categories.length));
    setFormOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
    setImage(row.image ?? "");
    setShowOnHome(row.showOnHome !== false);
    setHomeLabel(row.homeLabel ?? "");
    setSortOrderInput(String(row.sortOrder));
    setFormOpen(true);
  };

  const save = async () => {
    const nextSlug = slugify(slug) || slugify(name);
    if (!name.trim() || !nextSlug) {
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
          id: editing?.id ?? nextSlug,
          slug: nextSlug,
          name: name.trim(),
          description: description.trim() || undefined,
          image: image.trim() || undefined,
          sortOrder: Number(sortOrderInput) || 0,
          showOnHome,
          homeLabel: homeLabel.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            "ذخیره نشد. برای مدیریت دسته‌ها اتصال پایگاه‌داده لازم است.",
        );
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    setError("");
    setDeleteHint("");
    try {
      const qs = new URLSearchParams({ id: deleting.id });
      if (reassignTo) qs.set("reassignTo", reassignTo);
      const res = await fetch(`/api/admin/categories?${qs}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setDeleteHint(data.error ?? "این دسته محصول دارد.");
        if (!reassignTo && Array.isArray(data.categories) && data.categories[0]) {
          setReassignTo(String(data.categories[0].id));
        }
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "حذف نشد");
      setDeleting(null);
      setReassignTo("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Can permission="categories.manage">
        <div className="flex justify-end">
          <AdminButton type="button" onClick={openCreate}>
            افزودن دسته
          </AdminButton>
        </div>
      </Can>

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
          {
            key: "actions",
            header: "عملیات",
            render: (r) => (
              <Can permission="categories.manage">
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(r)}
                  >
                    ویرایش
                  </AdminButton>
                  <AdminButton
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setDeleting(r);
                      setReassignTo("");
                      setDeleteHint("");
                    }}
                  >
                    حذف
                  </AdminButton>
                </div>
              </Can>
            ),
          },
        ]}
      />

      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "ویرایش دسته" : "دسته جدید"}
        footer={
          <>
            <AdminButton
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
            >
              انصراف
            </AdminButton>
            <AdminButton
              type="button"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "در حال ذخیره..." : "ذخیره"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="نام" required>
            <AdminInput
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editing) setSlug(slugify(e.target.value));
              }}
            />
          </FormField>
          <FormField label="Slug" required>
            <AdminInput
              dir="ltr"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </FormField>
          <FormField label="توضیح">
            <AdminTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
          <FormField label="آدرس تصویر" hint="مسیر عمومی مثل /images/hajiasal/categories/mountain.jpg">
            <AdminInput
              dir="ltr"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </FormField>
          <FormField label="ترتیب نمایش">
            <AdminInput
              dir="ltr"
              type="number"
              value={sortOrderInput}
              onChange={(e) => setSortOrderInput(e.target.value)}
            />
          </FormField>
          <FormField label="عنوان نمایشی در صفحه اصلی">
            <AdminInput
              value={homeLabel}
              onChange={(e) => setHomeLabel(e.target.value)}
              placeholder="در صورت خالی بودن، نام دسته نمایش داده می‌شود"
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnHome}
              onChange={(e) => setShowOnHome(e.target.checked)}
            />
            نمایش در صفحه اصلی
          </label>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="حذف دسته"
        footer={
          <>
            <AdminButton
              type="button"
              variant="ghost"
              onClick={() => setDeleting(null)}
            >
              انصراف
            </AdminButton>
            <AdminButton
              type="button"
              variant="danger"
              disabled={saving}
              onClick={() => void remove()}
            >
              {saving ? "در حال حذف..." : "حذف"}
            </AdminButton>
          </>
        }
      >
        <p className="text-sm text-zinc-700">
          دسته «{deleting?.name}» حذف شود؟ اگر محصولی در این دسته باشد باید
          ابتدا به دسته دیگری منتقل شود.
        </p>
        {deleteHint ? (
          <p className="mt-3 text-sm text-amber-800">{deleteHint}</p>
        ) : null}
        {categories.filter((c) => c.id !== deleting?.id).length > 0 ? (
          <FormField label="انتقال محصولات به" hint="اگر دسته خالی است خالی بگذارید">
            <AdminSelect
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
            >
              <option value="">بدون انتقال</option>
              {categories
                .filter((c) => c.id !== deleting?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </AdminSelect>
          </FormField>
        ) : null}
      </AdminModal>
    </div>
  );
}

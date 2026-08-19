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
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { hajiasalPath } from "@/lib/paths";

type BannerRow = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  imageMobileUrl?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
  ctaHref?: string | null;
  placement: string;
  sortOrder: number;
  isActive: boolean;
  isDefault?: boolean;
};

const emptyForm = {
  title: "",
  subtitle: "",
  imageUrl: "",
  imageMobileUrl: "",
  linkUrl: "",
  ctaText: "",
  ctaHref: "",
  placement: "home_slider",
  sortOrder: "0",
  isActive: true,
  isDefault: false,
};

export default function AdminBannersPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [items, setItems] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BannerRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setItems(data.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row: BannerRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      subtitle: row.subtitle ?? "",
      imageUrl: row.imageUrl,
      imageMobileUrl: row.imageMobileUrl ?? "",
      linkUrl: row.linkUrl ?? "",
      ctaText: row.ctaText ?? "",
      ctaHref: row.ctaHref ?? row.linkUrl ?? "",
      placement: row.placement,
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
      isDefault: Boolean(row.isDefault),
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      toast.error("عنوان و تصویر الزامی است");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          imageUrl: form.imageUrl.trim(),
          imageMobileUrl: form.imageMobileUrl.trim() || null,
          linkUrl: form.linkUrl.trim() || null,
          ctaText: form.ctaText.trim() || null,
          ctaHref: form.ctaHref.trim() || null,
          placement: form.placement,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
          isDefault: form.isDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      toast.success(editing ? "بنر ویرایش شد" : "بنر ایجاد شد");
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: BannerRow) => {
    if (!window.confirm(`حذف «${row.title}»؟`)) return;
    const res = await fetch(`/api/admin/banners?id=${encodeURIComponent(row.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("حذف ناموفق");
      return;
    }
    toast.success("حذف شد");
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          اسلایدر صفحه اصلی: placement = home_slider
        </p>
        <Can permission="banners.manage">
          <AdminButton type="button" onClick={openCreate}>
            بنر جدید
          </AdminButton>
        </Can>
      </div>

      <DataTable
        data={items}
        rowKey={(r) => r.id}
        loading={loading}
        emptyMessage="بنری یافت نشد"
        columns={[
          { key: "title", header: "عنوان", render: (r) => r.title },
          {
            key: "placement",
            header: "محل",
            hideOnMobile: true,
            render: (r) => r.placement,
          },
          {
            key: "order",
            header: "ترتیب",
            hideOnMobile: true,
            render: (r) => r.sortOrder,
          },
          {
            key: "status",
            header: "وضعیت",
            render: (r) => (
              <StatusBadge status={r.isActive ? "active" : "disabled"} />
            ),
          },
          {
            key: "actions",
            header: "عملیات",
            render: (r) => (
              <Can permission="banners.manage">
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
                    onClick={() => void remove(r)}
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
        title={editing ? "ویرایش بنر" : "بنر جدید"}
      >
        <div className="space-y-3">
          <FormField label="عنوان" required>
            <AdminInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </FormField>
          <FormField label="توضیحات">
            <AdminTextarea
              rows={2}
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </FormField>
          <FormField label="تصویر دسکتاپ" required>
            <AdminInput
              dir="ltr"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </FormField>
          <FormField label="تصویر موبایل">
            <AdminInput
              dir="ltr"
              value={form.imageMobileUrl}
              onChange={(e) =>
                setForm({ ...form, imageMobileUrl: e.target.value })
              }
            />
          </FormField>
          <FormField label="متن دکمه">
            <AdminInput
              value={form.ctaText}
              onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            />
          </FormField>
          <FormField label="لینک دکمه">
            <AdminInput
              dir="ltr"
              value={form.ctaHref}
              onChange={(e) => setForm({ ...form, ctaHref: e.target.value })}
            />
          </FormField>
          <FormField label="لینک (قدیمی)">
            <AdminInput
              dir="ltr"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            />
          </FormField>
          <FormField label="محل نمایش">
            <AdminSelect
              value={form.placement}
              onChange={(e) => setForm({ ...form, placement: e.target.value })}
            >
              <option value="home_slider">اسلایدر صفحه اصلی</option>
              <option value="category">بنر دسته‌بندی</option>
              <option value="campaign">کمپین</option>
            </AdminSelect>
          </FormField>
          <FormField label="ترتیب">
            <AdminInput
              dir="ltr"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            فعال
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm({ ...form, isDefault: e.target.checked })
              }
            />
            اسلاید پیش‌فرض
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="outline" onClick={() => setFormOpen(false)}>
              انصراف
            </AdminButton>
            <AdminButton onClick={() => void save()} disabled={saving}>
              {saving ? "..." : "ذخیره"}
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

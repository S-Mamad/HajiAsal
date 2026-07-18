"use client";

import { useState } from "react";
import { AdminCrudList } from "@/components/admin/ui/AdminCrudList";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";

type Brand = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export default function AdminBrandsPage() {
  const toast = useAdminToast();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <AdminCrudList<Brand>
      endpoint="/api/admin/brands"
      dataKey="items"
      rowKey={(r) => r.id}
      searchKeys={(r) => `${r.name} ${r.slug}`}
      createPermission="brands.manage"
      deletePermission="brands.manage"
      createLabel="برند جدید"
      exportFilename="brands"
      exportRow={(r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        active: r.isActive,
      })}
      columns={[
        { key: "name", header: "نام", sortable: true, render: (r) => r.name },
        { key: "slug", header: "اسلاگ", hideOnMobile: true, render: (r) => r.slug },
        {
          key: "status",
          header: "وضعیت",
          render: (r) => (
            <StatusBadge status={r.isActive ? "active" : "disabled"} />
          ),
        },
      ]}
      renderForm={({ open, editing, onClose, onSaved }) => (
        <AdminModal
          open={open}
          onClose={onClose}
          title={editing ? "ویرایش برند" : "برند جدید"}
          footer={
            <AdminButton
              disabled={saving || !name || !slug}
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/brands", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      id: editing?.id,
                      name,
                      slug,
                      description: description || null,
                      isActive: true,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "خطا");
                  toast.success("ذخیره شد");
                  onSaved();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "خطا");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "..." : "ذخیره"}
            </AdminButton>
          }
        >
          <div className="space-y-3">
            <FormField label="نام" required>
              <AdminInput
                value={name || editing?.name || ""}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => {
                  if (editing && !name) {
                    setName(editing.name);
                    setSlug(editing.slug);
                    setDescription(editing.description ?? "");
                  }
                }}
              />
            </FormField>
            <FormField label="اسلاگ" required>
              <AdminInput
                dir="ltr"
                value={slug || editing?.slug || ""}
                onChange={(e) => setSlug(e.target.value)}
              />
            </FormField>
            <FormField label="توضیح">
              <AdminTextarea
                value={description || editing?.description || ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>
          </div>
        </AdminModal>
      )}
    />
  );
}

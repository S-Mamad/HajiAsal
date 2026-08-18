"use client";

import { useEffect, useState } from "react";
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
      editPermission="brands.manage"
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
        <BrandFormModal
          open={open}
          editing={editing}
          onClose={onClose}
          onSaved={onSaved}
          toast={toast}
          name={name}
          setName={setName}
          slug={slug}
          setSlug={setSlug}
          description={description}
          setDescription={setDescription}
          saving={saving}
          setSaving={setSaving}
        />
      )}
    />
  );
}

function BrandFormModal({
  open,
  editing,
  onClose,
  onSaved,
  toast,
  name,
  setName,
  slug,
  setSlug,
  description,
  setDescription,
  saving,
  setSaving,
}: {
  open: boolean;
  editing: Brand | null;
  onClose: () => void;
  onSaved: () => void;
  toast: ReturnType<typeof useAdminToast>;
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
}) {
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setSlug(editing.slug);
      setDescription(editing.description ?? "");
    } else {
      setName("");
      setSlug("");
      setDescription("");
    }
  }, [open, editing, setName, setSlug, setDescription]);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={editing ? "ویرایش برند" : "برند جدید"}
      footer={
        <>
          <AdminButton type="button" variant="outline" onClick={onClose}>
            انصراف
          </AdminButton>
          <AdminButton
            type="button"
            disabled={saving || !name.trim() || !slug.trim()}
            onClick={async () => {
            setSaving(true);
            try {
              const res = await fetch("/api/admin/brands", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  id: editing?.id,
                  name: name.trim(),
                  slug: slug.trim(),
                  description: description.trim() || null,
                  isActive: editing?.isActive ?? true,
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
            {saving ? "در حال ذخیره..." : "ذخیره"}
          </AdminButton>
        </>
      }
    >
      <div className="space-y-3">
        <FormField label="نام" required>
          <AdminInput value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="اسلاگ" required>
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
      </div>
    </AdminModal>
  );
}

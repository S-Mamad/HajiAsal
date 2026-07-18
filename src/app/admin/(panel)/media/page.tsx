"use client";

import { useState } from "react";
import { AdminCrudList } from "@/components/admin/ui/AdminCrudList";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";

type Media = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

export default function AdminMediaPage() {
  const toast = useAdminToast();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [mime, setMime] = useState("image/webp");
  const [saving, setSaving] = useState(false);

  return (
    <AdminCrudList<Media>
      endpoint="/api/admin/media"
      dataKey="items"
      rowKey={(r) => r.id}
      searchKeys={(r) => `${r.originalName} ${r.mimeType} ${r.url}`}
      createPermission="media.manage"
      deletePermission="media.manage"
      createLabel="ثبت رسانه"
      exportFilename="media"
      exportRow={(r) => ({
        id: r.id,
        name: r.originalName,
        mime: r.mimeType,
        url: r.url,
        size: r.sizeBytes,
      })}
      columns={[
        { key: "name", header: "نام", render: (r) => r.originalName },
        { key: "mime", header: "نوع", hideOnMobile: true, render: (r) => r.mimeType },
        {
          key: "url",
          header: "آدرس",
          render: (r) => (
            <a href={r.url} className="text-amber-800 hover:underline" target="_blank" rel="noreferrer">
              مشاهده
            </a>
          ),
        },
      ]}
      renderForm={({ open, onClose, onSaved }) => (
        <AdminModal
          open={open}
          onClose={onClose}
          title="ثبت فایل رسانه"
          footer={
            <AdminButton
              disabled={saving || !url || !name}
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/media", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      filename: name,
                      originalName: name,
                      mimeType: mime,
                      sizeBytes: 0,
                      url,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error ?? "خطا");
                  toast.success("ثبت شد");
                  setUrl("");
                  setName("");
                  onSaved();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "خطا");
                } finally {
                  setSaving(false);
                }
              }}
            >
              ذخیره
            </AdminButton>
          }
        >
          <div className="space-y-3">
            <FormField label="نام فایل" required>
              <AdminInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="آدرس URL" required tooltip="مسیر فایل در public یا CDN">
              <AdminInput dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} />
            </FormField>
            <FormField label="MIME">
              <AdminInput dir="ltr" value={mime} onChange={(e) => setMime(e.target.value)} />
            </FormField>
          </div>
        </AdminModal>
      )}
    />
  );
}

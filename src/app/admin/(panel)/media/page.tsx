"use client";

import { useState } from "react";
import Image from "next/image";
import { AdminCrudList } from "@/components/admin/ui/AdminCrudList";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { shouldUnoptimizeProductImage } from "@/lib/product-image";

type Media = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  folder?: string | null;
  createdAt: string;
};

export default function AdminMediaPage() {
  const toast = useAdminToast();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [mime, setMime] = useState("image/webp");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceSaving, setReplaceSaving] = useState(false);

  const canSave = Boolean(file) || Boolean(url.trim() && name.trim());

  return (
    <AdminCrudList<Media>
      endpoint="/api/admin/media"
      dataKey="items"
      rowKey={(r) => r.id}
      searchKeys={(r) => `${r.originalName} ${r.mimeType} ${r.url} ${r.folder ?? ""}`}
      createPermission="media.manage"
      editPermission="media.manage"
      deletePermission="media.manage"
      allowEdit
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
        {
          key: "preview",
          header: "پیش‌نمایش",
          render: (r) =>
            r.mimeType.startsWith("image/") ? (
              <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                <Image
                  src={r.url}
                  alt={r.originalName}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized={shouldUnoptimizeProductImage(r.url)}
                />
              </div>
            ) : (
              <span className="text-xs text-stone-400">—</span>
            ),
        },
        { key: "name", header: "نام", render: (r) => r.originalName },
        {
          key: "folder",
          header: "پوشه",
          hideOnMobile: true,
          render: (r) => r.folder ?? "—",
        },
        { key: "mime", header: "نوع", hideOnMobile: true, render: (r) => r.mimeType },
        {
          key: "url",
          header: "آدرس",
          render: (r) => (
            <a
              href={r.url}
              className="text-amber-800 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              مشاهده
            </a>
          ),
        },
      ]}
      renderForm={({ open, onClose, onSaved, editing }) => (
        <AdminModal
          open={open}
          onClose={onClose}
          title={editing ? "ویرایش رسانه" : "ثبت فایل رسانه"}
          footer={
            editing ? (
              <AdminButton
                disabled={replaceSaving || !replaceFile}
                onClick={async () => {
                  if (!replaceFile || !editing) return;
                  setReplaceSaving(true);
                  try {
                    const form = new FormData();
                    form.append("id", editing.id);
                    form.append("file", replaceFile);
                    const res = await fetch("/api/admin/media", {
                      method: "PATCH",
                      credentials: "include",
                      body: form,
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error ?? "خطا");
                    toast.success("تصویر جایگزین شد");
                    setReplaceFile(null);
                    onSaved();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "خطا");
                  } finally {
                    setReplaceSaving(false);
                  }
                }}
              >
                {replaceSaving ? "در حال جایگزینی..." : "جایگزینی تصویر"}
              </AdminButton>
            ) : (
              <AdminButton
                disabled={saving || !canSave}
                onClick={async () => {
                  setSaving(true);
                  try {
                    let res: Response;
                    if (file) {
                      const form = new FormData();
                      form.append("file", file);
                      form.append("folder", "library");
                      res = await fetch("/api/admin/media", {
                        method: "POST",
                        credentials: "include",
                        body: form,
                      });
                    } else {
                      res = await fetch("/api/admin/media", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          filename: name,
                          originalName: name,
                          mimeType: mime,
                          sizeBytes: 0,
                          url: url.trim(),
                        }),
                      });
                    }
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error ?? "خطا");
                    toast.success("ثبت شد");
                    setUrl("");
                    setName("");
                    setFile(null);
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
            )
          }
        >
          {editing ? (
            <div className="space-y-3">
              {editing.mimeType.startsWith("image/") ? (
                <div className="relative mx-auto h-48 w-full max-w-sm overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                  <Image
                    src={editing.url}
                    alt={editing.originalName}
                    fill
                    sizes="384px"
                    className="object-contain"
                    unoptimized={shouldUnoptimizeProductImage(editing.url)}
                  />
                </div>
              ) : null}
              <p className="text-xs text-stone-500" dir="ltr">
                {editing.url}
              </p>
              <FormField label="جایگزینی فایل" tooltip="برای تصاویر محلی، همان مسیر قبلی حفظ می‌شود">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="block w-full text-sm"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
                />
              </FormField>
            </div>
          ) : (
            <div className="space-y-3">
              <FormField label="آپلود فایل" tooltip="JPEG/PNG/WebP/GIF تا ۵ مگابایت">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="block w-full text-sm"
                  onChange={(e) => {
                    const next = e.target.files?.[0] ?? null;
                    setFile(next);
                    if (next) {
                      setName(next.name);
                      setMime(next.type || "image/jpeg");
                    }
                  }}
                />
              </FormField>
              <p className="text-xs text-stone-400">یا لینک عمومی:</p>
              <FormField label="نام فایل">
                <AdminInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={Boolean(file)}
                />
              </FormField>
              <FormField label="آدرس URL" tooltip="مسیر فایل در public یا CDN">
                <AdminInput
                  dir="ltr"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={Boolean(file)}
                />
              </FormField>
              <FormField label="MIME">
                <AdminInput
                  dir="ltr"
                  value={mime}
                  onChange={(e) => setMime(e.target.value)}
                  disabled={Boolean(file)}
                />
              </FormField>
            </div>
          )}
        </AdminModal>
      )}
    />
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, FormField } from "@/components/admin/ui/AdminForm";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { shouldUnoptimizeProductImage } from "@/lib/product-image";

type MediaItem = {
  id: string;
  originalName: string;
  url: string;
  mimeType: string;
};

export function MediaImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const toast = useAdminToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری رسانه");
      setItems(
        ((data.items ?? []) as MediaItem[]).filter((item) =>
          item.mimeType.startsWith("image/"),
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    void loadMedia();
  }, [open, loadMedia]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "site");
      const res = await fetch("/api/admin/media", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق");
      const url = (data.item as { url?: string })?.url;
      if (!url) throw new Error("آدرس تصویر برنگشت");
      onChange(url);
      setOpen(false);
      toast.success("تصویر انتخاب شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FormField label={label} hint={hint}>
      <div className="space-y-3">
        {value ? (
          <div className="relative h-36 w-full max-w-xs overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
            <Image
              src={value}
              alt=""
              fill
              sizes="320px"
              className="object-cover"
              unoptimized={shouldUnoptimizeProductImage(value)}
            />
          </div>
        ) : (
          <p className="text-xs text-stone-400">تصویری انتخاب نشده</p>
        )}
        <div className="flex flex-wrap gap-2">
          <AdminButton type="button" variant="outline" onClick={() => setOpen(true)}>
            انتخاب از رسانه
          </AdminButton>
          {value ? (
            <AdminButton type="button" variant="ghost" onClick={() => onChange("")}>
              حذف
            </AdminButton>
          ) : null}
        </div>
        <AdminInput dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title="انتخاب تصویر"
        footer={
          <label className="inline-flex cursor-pointer">
            <span className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
              {uploading ? "در حال آپلود..." : "آپلود تصویر جدید"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
                e.target.value = "";
              }}
            />
          </label>
        }
      >
        {loading ? (
          <p className="text-sm text-stone-500">در حال بارگذاری...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500">تصویری در کتابخانه نیست.</p>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="overflow-hidden rounded-xl border border-stone-200 bg-white text-start transition hover:border-amber-700"
                onClick={() => {
                  onChange(item.url);
                  setOpen(false);
                  toast.success("تصویر انتخاب شد");
                }}
              >
                <div className="relative aspect-square bg-stone-100">
                  <Image
                    src={item.url}
                    alt={item.originalName}
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized={shouldUnoptimizeProductImage(item.url)}
                  />
                </div>
                <p className="truncate px-2 py-1.5 text-xs text-stone-600">
                  {item.originalName}
                </p>
              </button>
            ))}
          </div>
        )}
      </AdminModal>
    </FormField>
  );
}

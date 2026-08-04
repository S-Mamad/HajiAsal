"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { AdminButton } from "@/components/admin/ui/AdminButton";

async function uploadSellerImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/seller/media", {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? "آپلود تصویر ناموفق بود",
    );
  }
  const url = (data as { file?: { url?: string } }).file?.url;
  if (!url) throw new Error("آدرس تصویر از سرور برنگشت");
  return url;
}

export function SellerProductImageField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const primary = images[0] ?? "";

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("فقط فایل تصویری مجاز است");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadSellerImage(file);
      onChange([url, ...images.slice(1)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در آپلود");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (url.startsWith("blob:")) {
      setError("آدرس موقت مرورگر قابل ذخیره نیست. فایل را آپلود کنید.");
      return;
    }
    onChange([url, ...images.slice(1)]);
    setUrlDraft("");
    setError("");
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
      />
      {primary ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={primary}
          alt=""
          className="h-28 w-28 rounded-lg border border-stone-200 object-cover"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <AdminButton
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "در حال آپلود..." : "آپلود تصویر"}
        </AdminButton>
        {primary ? (
          <AdminButton
            type="button"
            variant="ghost"
            onClick={() => onChange([])}
          >
            حذف تصویر
          </AdminButton>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1">
          <Input
            label="یا آدرس تصویر (URL)"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder={primary || "https://..."}
            dir="ltr"
          />
        </div>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          disabled={!urlDraft.trim()}
          onClick={applyUrl}
        >
          اعمال
        </AdminButton>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

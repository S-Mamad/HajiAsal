"use client";

import { useCallback, useState } from "react";
import { DotsSixVertical, Trash, Plus } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { cn } from "@/lib/utils";

async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "products");
  const res = await fetch("/api/admin/media", {
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
  const url = (data as { item?: { url?: string } }).item?.url;
  if (!url) throw new Error("آدرس تصویر از سرور برنگشت");
  return url;
}

export function MediaDropzone({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [draftUrl, setDraftUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const addUrl = () => {
    const url = draftUrl.trim();
    if (!url) return;
    if (url.startsWith("blob:")) {
      setUploadError("آدرس موقت مرورگر قابل ذخیره نیست. فایل را آپلود کنید یا URL عمومی بگذارید.");
      return;
    }
    onChange([...images, url]);
    setDraftUrl("");
    setUploadError("");
  };

  const onDropFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setUploadError("");
      try {
        const uploaded: string[] = [];
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          uploaded.push(await uploadImageFile(file));
        }
        if (uploaded.length) onChange([...images, ...uploaded]);
        if (!uploaded.length) {
          setUploadError("فایل تصویری معتبری انتخاب نشد");
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "خطا در آپلود");
      } finally {
        setUploading(false);
      }
    },
    [images, onChange],
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onDropFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver
            ? "border-zinc-800 bg-zinc-50"
            : "border-zinc-200 bg-white",
        )}
      >
        <p className="text-sm text-zinc-600">
          تصویر را اینجا رها کنید یا URL عمومی اضافه کنید
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          فایل‌ها روی سرور ثبت می‌شوند و آدرس پایدار برمی‌گردد.
        </p>
        <label className="mt-3 inline-flex cursor-pointer">
          <span className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            {uploading ? "در حال آپلود..." : "انتخاب فایل"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              void onDropFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {uploadError ? (
        <p className="text-sm text-red-600">{uploadError}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          label="آدرس تصویر"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1"
        />
        <AdminButton
          type="button"
          variant="outline"
          className="sm:mt-7"
          onClick={addUrl}
          disabled={uploading}
        >
          <Icon icon={Plus} size={16} />
          افزودن
        </AdminButton>
      </div>

      <ul className="space-y-2">
        {images.map((src, index) => (
          <li
            key={`${src.slice(0, 48)}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex == null) return;
              move(dragIndex, index);
              setDragIndex(null);
            }}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2"
          >
            <Icon icon={DotsSixVertical} size={18} className="text-zinc-400" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-14 w-14 rounded-lg object-cover"
            />
            <p className="min-w-0 flex-1 truncate text-xs text-zinc-600">
              {src.startsWith("data:") ? "تصویر آپلودشده" : src}
            </p>
            <AdminButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(images.filter((_, i) => i !== index))}
            >
              <Icon icon={Trash} size={16} />
            </AdminButton>
          </li>
        ))}
      </ul>
    </div>
  );
}

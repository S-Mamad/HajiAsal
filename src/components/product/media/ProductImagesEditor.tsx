"use client";

import { useCallback, useRef, useState } from "react";
import { DotsSixVertical, Trash, Plus } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ProductFrameEditor } from "@/components/product/frame/ProductFrameEditor";
import { ProductStorefrontPreviews } from "@/components/product/media/ProductStorefrontPreviews";
import { cn } from "@/lib/utils";
import {
  pruneImageFits,
  writeImageFit,
  type ProductImageFit,
} from "@/lib/product-image";

type Props = {
  images: string[];
  onChange: (next: string[]) => void;
  imageFits?: Record<string, ProductImageFit>;
  onFitsChange: (next: Record<string, ProductImageFit>) => void;
  canUpload?: boolean;
  uploadFile: (file: File) => Promise<string>;
};

export function ProductImagesEditor({
  images,
  onChange,
  imageFits,
  onFitsChange,
  canUpload = true,
  uploadFile,
}: Props) {
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const fitsRef = useRef(imageFits);
  fitsRef.current = imageFits;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFitsChangeRef = useRef(onFitsChange);
  onFitsChangeRef.current = onFitsChange;

  const [draftUrl, setDraftUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const setImages = (next: string[]) => {
    const pruned = pruneImageFits(fitsRef.current, next) ?? {};
    fitsRef.current = pruned;
    onChangeRef.current(next);
    onFitsChangeRef.current(pruned);
  };

  const addUrl = () => {
    const url = draftUrl.trim();
    if (!url) return;
    if (url.startsWith("blob:")) {
      setUploadError(
        "آدرس موقت مرورگر قابل ذخیره نیست. فایل را آپلود کنید یا URL عمومی بگذارید.",
      );
      return;
    }
    setImages([...imagesRef.current, url]);
    setDraftUrl("");
    setUploadError("");
  };

  const onDropFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      if (!canUpload) {
        setUploadError("برای آپلود فایل دسترسی ندارید؛ URL عمومی اضافه کنید.");
        return;
      }
      setUploading(true);
      setUploadError("");
      try {
        const uploaded: string[] = [];
        for (const file of Array.from(files)) {
          if (!file.type.startsWith("image/")) continue;
          uploaded.push(await uploadFile(file));
        }
        if (uploaded.length) {
          setImages([...imagesRef.current, ...uploaded]);
        } else {
          setUploadError("فایل تصویری معتبری انتخاب نشد");
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "خطا در آپلود");
      } finally {
        setUploading(false);
      }
    },
    [canUpload, uploadFile],
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= imagesRef.current.length) return;
    const next = [...imagesRef.current];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setImages(next);
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
          dragOver ? "border-zinc-800 bg-zinc-50" : "border-zinc-200 bg-white",
        )}
      >
        <p className="text-sm text-zinc-600">
          تصویر را اینجا رها کنید یا URL عمومی اضافه کنید
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          زوم و جابه‌جایی روی همه قالب‌های فروشگاه اعمال می‌شود.
        </p>
        {canUpload ? (
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
        ) : (
          <p className="mt-3 text-xs text-amber-700">
            آپلود فایل برای نقش شما فعال نیست؛ از URL عمومی استفاده کنید.
          </p>
        )}
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

      <ul className="space-y-4">
        {images.map((src, index) => (
          <li
            key={`${src.slice(0, 48)}-${index}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex == null) return;
              move(dragIndex, index);
              setDragIndex(null);
            }}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <button
                type="button"
                draggable
                onDragStart={() => setDragIndex(index)}
                aria-label="جابه‌جایی ترتیب"
                className="mt-1 hidden cursor-grab text-zinc-400 sm:block"
              >
                <Icon icon={DotsSixVertical} size={18} />
              </button>
              <ProductFrameEditor
                src={src}
                value={imageFits?.[src]}
                onChange={(next) => {
                  const updated = writeImageFit(fitsRef.current, src, next);
                  fitsRef.current = updated;
                  onFitsChangeRef.current(updated);
                }}
              />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs text-zinc-600" dir="ltr">
                  {src.startsWith("data:") ? "تصویر آپلودشده" : src}
                </p>
                {index === 0 ? (
                  <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                    تصویر اصلی
                  </span>
                ) : null}
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setImages(imagesRef.current.filter((_, i) => i !== index))
                  }
                >
                  <Icon icon={Trash} size={16} />
                  حذف
                </AdminButton>
              </div>
            </div>
            <ProductStorefrontPreviews src={src} imageFit={imageFits?.[src]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

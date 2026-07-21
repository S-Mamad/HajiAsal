"use client";

import { useCallback, useState } from "react";
import { DotsSixVertical, Trash, Plus } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { cn } from "@/lib/utils";

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

  const addUrl = () => {
    const url = draftUrl.trim();
    if (!url) return;
    onChange([...images, url]);
    setDraftUrl("");
  };

  const onDropFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const urls: string[] = [];
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          urls.push(URL.createObjectURL(file));
        }
      });
      if (urls.length) onChange([...images, ...urls]);
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
          onDropFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver
            ? "border-stone-800 bg-stone-50"
            : "border-stone-200 bg-white",
        )}
      >
        <p className="text-sm text-stone-600">
          تصویر را اینجا رها کنید یا URL اضافه کنید
        </p>
        <p className="mt-1 text-xs text-stone-400">
          آپلود فایل به‌صورت پیش‌نمایش محلی است؛ برای انتشار از URL عمومی استفاده کنید.
        </p>
        <label className="mt-3 inline-flex cursor-pointer">
          <span className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50">
            انتخاب فایل
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onDropFiles(e.target.files)}
          />
        </label>
      </div>

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
        >
          <Icon icon={Plus} size={16} />
          افزودن
        </AdminButton>
      </div>

      <ul className="space-y-2">
        {images.map((src, index) => (
          <li
            key={`${src}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex == null) return;
              move(dragIndex, index);
              setDragIndex(null);
            }}
            className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2"
          >
            <Icon icon={DotsSixVertical} size={18} className="text-stone-400" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-14 w-14 rounded-lg object-cover"
            />
            <p className="min-w-0 flex-1 truncate text-xs text-stone-600">
              {src}
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

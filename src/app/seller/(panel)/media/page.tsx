"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";

type FileRow = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
};

export default function SellerMediaPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/media");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      setFiles(data.files ?? []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadFile = async (file: File) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/seller/media", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق");
      setMessage("فایل آپلود شد");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addByUrl = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/seller/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "file",
          mimeType: "image/jpeg",
          sizeBytes: 0,
          url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setName("");
      setUrl("");
      setMessage("لینک ثبت شد");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch("/api/seller/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-sm font-medium text-stone-800">آپلود فایل</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-sm"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
          }}
        />
        <p className="text-xs text-stone-400">
          JPEG / PNG / WebP / GIF · حداکثر ۵ مگابایت
        </p>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <Input
          label="نام (لینک خارجی)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="آدرس فایل"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <AdminButton onClick={() => void addByUrl()} disabled={!url || busy}>
          افزودن لینک
        </AdminButton>
      </div>

      <SellerDataTable
        storageKey="seller.media.grid"
        loading={loading}
        columns={[
          { key: "name", header: "نام", render: (r) => r.name },
          { key: "mime", header: "نوع", render: (r) => r.mimeType },
          {
            key: "url",
            header: "لینک",
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
          {
            key: "actions",
            header: "",
            render: (r) => (
              <button
                type="button"
                className="text-sm text-rose-700"
                onClick={() => void remove(r.id)}
              >
                حذف
              </button>
            ),
          },
        ]}
        data={files}
        rowKey={(r) => r.id}
        emptyMessage="فایلی نیست"
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [files, setFiles] = useState<FileRow[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);

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

  const upload = async () => {
    await fetch("/api/seller/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || "file",
        mimeType: "image/jpeg",
        sizeBytes: 0,
        url,
      }),
    });
    setName("");
    setUrl("");
    await load();
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
      <div className="flex flex-wrap gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <Input label="نام" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="آدرس فایل" value={url} onChange={(e) => setUrl(e.target.value)} />
        <AdminButton onClick={() => void upload()} disabled={!url}>
          افزودن
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
              <a href={r.url} className="text-amber-800 hover:underline" target="_blank" rel="noreferrer">
                مشاهده
              </a>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <button type="button" className="text-sm text-rose-700" onClick={() => void remove(r.id)}>
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

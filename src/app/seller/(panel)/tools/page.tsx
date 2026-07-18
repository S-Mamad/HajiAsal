"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";

export default function SellerToolsPage() {
  const [json, setJson] = useState(
    '[{"title":"عسل تست","category":"specialty","price":450000,"grams":1000,"weightLabel":"۱ کیلو","shortDescription":"","inStock":true}]',
  );
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const downloadTemplate = () => {
    window.location.href = "/api/seller/tools?mode=template";
  };

  const exportProducts = () => {
    window.location.href = "/api/seller/tools?mode=export";
  };

  const runImport = async () => {
    setError("");
    setResult("");
    try {
      const rows = JSON.parse(json) as unknown;
      const res = await fetch("/api/seller/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setResult(`ایجاد شد: ${data.created} · خطا: ${(data.errors ?? []).length}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="outline" onClick={downloadTemplate}>
          دانلود نمونه CSV
        </AdminButton>
        <AdminButton variant="outline" onClick={exportProducts}>
          برون‌ریزی محصولات
        </AdminButton>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="font-semibold">درون‌ریزی JSON (حداکثر ۵۰۰ ردیف)</h3>
        <textarea
          className="mt-3 min-h-40 w-full rounded-lg border border-stone-200 p-3 font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        {result ? <p className="mt-2 text-sm text-emerald-700">{result}</p> : null}
        <AdminButton className="mt-3" onClick={() => void runImport()}>
          اجرای Import
        </AdminButton>
      </div>
    </div>
  );
}

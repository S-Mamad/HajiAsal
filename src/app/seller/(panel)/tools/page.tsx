"use client";

import { useRef, useState } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";

export default function SellerToolsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [json, setJson] = useState(
    '[{"title":"عسل تست","category":"specialty","price":450000,"grams":1000,"weightLabel":"۱ کیلو","shortDescription":"","inStock":true}]',
  );
  const [submitForReview, setSubmitForReview] = useState(true);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    window.location.href = "/api/seller/tools?mode=template";
  };

  const exportProducts = () => {
    window.location.href = "/api/seller/tools?mode=export";
  };

  const runJsonImport = async () => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const rows = JSON.parse(json) as unknown;
      const res = await fetch("/api/seller/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, submitForReview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setResult(`ایجاد شد: ${data.created} · خطا: ${(data.errors ?? []).length}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
    }
  };

  const runCsvImport = async (file: File) => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("submitForReview", String(submitForReview));
      const res = await fetch("/api/seller/tools", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setResult(`ایجاد شد: ${data.created} · خطا: ${(data.errors ?? []).length}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void runCsvImport(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <AdminButton variant="outline" onClick={downloadTemplate}>
          دانلود نمونه CSV
        </AdminButton>
        <AdminButton
          variant="outline"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          درون‌ریزی CSV
        </AdminButton>
        <AdminButton variant="outline" onClick={exportProducts}>
          برون‌ریزی محصولات
        </AdminButton>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={submitForReview}
          onChange={(e) => setSubmitForReview(e.target.checked)}
        />
        ارسال مستقیم برای تأیید ادمین (در غیر این صورت پیش‌نویس محلی)
      </label>

      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h3 className="font-semibold">درون‌ریزی JSON (حداکثر ۵۰۰ ردیف)</h3>
        <textarea
          className="mt-3 min-h-40 w-full rounded-lg border border-stone-200 p-3 font-mono text-xs"
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
        {result ? <p className="mt-2 text-sm text-emerald-700">{result}</p> : null}
        <AdminButton
          className="mt-3"
          disabled={busy}
          onClick={() => void runJsonImport()}
        >
          {busy ? "در حال اجرا..." : "اجرای Import JSON"}
        </AdminButton>
      </div>
    </div>
  );
}

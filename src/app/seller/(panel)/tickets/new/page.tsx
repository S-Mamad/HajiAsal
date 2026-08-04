"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

export default function SellerTicketNewPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "خطا");
        return;
      }
      router.push(hajiasalPath(`/seller/tickets/${data.id}`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href={hajiasalPath("/seller/tickets")}
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-zinc-900"
      >
        <Icon icon={ArrowRight} size={16} />
        بازگشت
      </Link>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">تیکت جدید</h2>
        <p className="mt-1 text-sm text-stone-500">
          موضوع و جزئیات را بنویسید تا پشتیبانی پاسخ دهد.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <Input
          label="عنوان"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">اولویت</span>
          <select
            className="w-full rounded-lg border border-stone-200 px-3 py-2"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">کم</option>
            <option value="normal">عادی</option>
            <option value="high">بالا</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-stone-600">متن</span>
          <textarea
            className="min-h-32 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="توضیح مشکل یا درخواست…"
          />
        </label>
        <AdminButton
          onClick={() => void submit()}
          disabled={saving || subject.trim().length < 3 || body.trim().length < 3}
        >
          {saving ? "در حال ارسال…" : "ارسال تیکت"}
        </AdminButton>
      </div>
    </div>
  );
}

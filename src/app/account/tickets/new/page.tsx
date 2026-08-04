"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

export default function AccountTicketNewPage() {
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
      const res = await fetch("/api/account/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, priority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ایجاد تیکت");
      router.push(hajiasalPath(`/account/tickets/${data.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Link
        href={hajiasalPath("/account/tickets")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-secondary hover:text-primary"
      >
        <Icon icon={ArrowRight} size={16} />
        بازگشت
      </Link>
      <AccountPageHeader
        title="تیکت جدید"
        subtitle="موضوع و توضیحات را بنویسید تا پشتیبانی پاسخ دهد."
      />

      <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-surface p-5">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-primary">موضوع</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-3 outline-none focus:ring-2 focus:ring-gold/30"
            placeholder="مثلاً مشکل در سفارش"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-primary">اولویت</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-surface-elevated px-3 outline-none focus:ring-2 focus:ring-gold/30"
          >
            <option value="low">کم</option>
            <option value="normal">عادی</option>
            <option value="high">بالا</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-primary">متن پیام</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full resize-y rounded-xl border border-border bg-surface-elevated px-3 py-2.5 outline-none focus:ring-2 focus:ring-gold/30"
            placeholder="جزئیات را بنویسید…"
          />
        </label>
        <button
          type="button"
          disabled={saving || subject.trim().length < 3 || body.trim().length < 3}
          onClick={() => void submit()}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gold text-sm font-medium text-primary transition hover:brightness-95 disabled:opacity-40"
        >
          {saving ? "در حال ارسال…" : "ارسال تیکت"}
        </button>
      </div>
    </div>
  );
}

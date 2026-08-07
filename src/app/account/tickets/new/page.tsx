"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { TicketCreateForm } from "@/components/tickets/TicketCreateForm";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

export default function AccountTicketNewPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (input: {
    subject: string;
    body: string;
    priority: string;
  }) => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/account/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
      >
        <Icon icon={ArrowRight} size={16} />
        بازگشت به پشتیبانی
      </Link>
      <AccountPageHeader
        title="تیکت جدید"
        subtitle="موضوع و توضیحات را بنویسید تا پشتیبانی پاسخ دهد."
      />
      <div className="account-surface mx-auto max-w-lg rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <TicketCreateForm
          variant="storefront"
          submitting={saving}
          error={error}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

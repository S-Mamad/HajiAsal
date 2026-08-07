"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { TicketCreateForm } from "@/components/tickets/TicketCreateForm";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

export default function SellerTicketNewPage() {
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
      const res = await fetch("/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
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
      <TicketCreateForm
        variant="admin"
        submitting={saving}
        error={error}
        onSubmit={submit}
      />
    </div>
  );
}

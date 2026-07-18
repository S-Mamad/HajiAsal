"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Input } from "@/components/ui/Input";
import { hajiasalPath } from "@/lib/paths";

export default function SellerTicketNewPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
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
  };

  return (
    <div className="mx-auto max-w-lg space-y-3">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <Input label="عنوان" value={subject} onChange={(e) => setSubject(e.target.value)} />
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
          className="min-h-32 w-full rounded-lg border border-stone-200 px-3 py-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <AdminButton onClick={() => void submit()} disabled={!subject || !body}>
        ارسال تیکت
      </AdminButton>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

export default function SellerTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<{ subject: string; status: string } | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; senderType: string; body: string; createdAt: string }>>([]);
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/seller/tickets/${params.id}`);
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    if (!res.ok) {
      router.push(hajiasalPath("/seller/tickets"));
      return;
    }
    const data = await res.json();
    setTicket(data.ticket);
    setMessages(data.messages ?? []);
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    await fetch(`/api/seller/tickets/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply }),
    });
    setReply("");
    await load();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h3 className="text-lg font-semibold">{ticket?.subject ?? "..."}</h3>
      <p className="text-sm text-stone-500">وضعیت: {ticket?.status}</p>
      <ul className="space-y-2">
        {messages.map((m) => (
          <li key={m.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
            <p className="text-xs text-stone-400">
              {m.senderType} · {new Date(m.createdAt).toLocaleString("fa-IR")}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>
      <textarea
        className="min-h-24 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="پاسخ شما..."
      />
      <AdminButton onClick={() => void send()} disabled={!reply.trim()}>
        ارسال پاسخ
      </AdminButton>
    </div>
  );
}

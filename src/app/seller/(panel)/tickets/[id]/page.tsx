"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { TicketChat } from "@/components/tickets/TicketChat";
import type { ChatMessage } from "@/components/tickets/chat-utils";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

export default function SellerTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<{
    subject: string;
    status: string;
    priority: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/seller/tickets/${params.id}`);
        if (res.status === 401) {
          router.push(hajiasalPath("/seller"));
          return;
        }
        if (!res.ok) {
          if (res.status === 404) {
            router.push(hajiasalPath("/seller/tickets"));
            return;
          }
          const data = await res.json().catch(() => ({}));
          setError(
            typeof data.error === "string" ? data.error : "خطا در بارگذاری تیکت",
          );
          return;
        }
        const data = await res.json();
        setTicket(data.ticket);
        setMessages(data.messages ?? []);
      } catch {
        setError("خطا در بارگذاری تیکت");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [params.id, router],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
    replyToId?: string | null;
  }) => {
    const res = await fetch(`/api/seller/tickets/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: input.body,
        attachmentUrl: input.attachmentUrl,
        attachmentName: input.attachmentName,
        attachmentMime: input.attachmentMime,
        clientMessageId: input.clientMessageId,
        replyToId: input.replyToId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق");
    await load({ silent: true });
  };

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/seller/tickets/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق");
    const url = (data.file?.url ?? data.item?.url) as string | undefined;
    if (!url) throw new Error("آدرس فایل دریافت نشد");
    return {
      url,
      name: data.file?.name ?? file.name,
      mimeType: data.file?.mimeType ?? file.type,
    };
  };

  const toggleClose = async () => {
    if (!ticket) return;
    const isClosed =
      ticket.status === "closed" || ticket.status === "resolved";
    const next = isClosed ? "open" : "closed";
    const res = await fetch(`/api/seller/tickets/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) await load({ silent: true });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
      <Link
        href={hajiasalPath("/seller/tickets")}
        className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-zinc-900"
      >
        <Icon icon={ArrowRight} size={16} />
        بازگشت
      </Link>

      {ticket ? (
        <TicketChat
          ticketId={params.id}
          subject={ticket.subject}
          status={ticket.status}
          priority={ticket.priority}
          messages={messages}
          selfSenderType="seller"
          variant="admin"
          loading={loading}
          error={error || null}
          onRetryLoad={() => void load()}
          onPollUpdate={() => void load({ silent: true })}
          pollUrl={`/api/seller/tickets/${params.id}`}
          onSend={send}
          onUpload={upload}
          headerActions={
            <AdminButton
              size="sm"
              variant="outline"
              onClick={() => void toggleClose()}
            >
              {ticket.status === "closed" || ticket.status === "resolved"
                ? "بازگشایی"
                : "بستن تیکت"}
            </AdminButton>
          }
        />
      ) : loading ? (
        <div className="h-[min(70vh,40rem)] animate-pulse rounded-xl bg-stone-100" />
      ) : (
        <p className="text-sm text-rose-600">{error || "تیکت یافت نشد"}</p>
      )}
    </div>
  );
}

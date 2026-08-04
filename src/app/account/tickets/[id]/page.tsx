"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { TicketChat } from "@/components/tickets/TicketChat";
import type { ChatMessage } from "@/components/tickets/chat-utils";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";

export default function AccountTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<{
    id: string;
    subject: string;
    status: string;
    priority: string;
    csatScore?: number | null;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/account/tickets/${params.id}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(hajiasalPath("/login?redirect=/account/tickets"));
        return;
      }
      if (!res.ok) {
        setError("تیکت یافت نشد");
        setTicket(null);
        return;
      }
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch {
      setError("خطا در بارگذاری");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [params.id, router]);

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
    const res = await fetch(`/api/account/tickets/${params.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق");
    await load();
  };

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/account/tickets/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق");
    const url = data.file?.url as string | undefined;
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
    const res = await fetch(`/api/account/tickets/${params.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) await load();
  };

  const sendCsat = async (score: number) => {
    await fetch(`/api/account/tickets/${params.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csatScore: score, status: "closed" }),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      <Link
        href={hajiasalPath("/account/tickets")}
        className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary"
      >
        <Icon icon={ArrowRight} size={16} />
        بازگشت به تیکت‌ها
      </Link>

      {ticket ? (
        <>
          <TicketChat
            ticketId={ticket.id}
            subject={ticket.subject}
            status={ticket.status}
            priority={ticket.priority}
            messages={messages}
            selfSenderType="customer"
            variant="storefront"
            loading={loading}
            error={error || null}
            onRetryLoad={() => void load()}
            onPollUpdate={() => void load({ silent: true })}
            pollUrl={`/api/account/tickets/${ticket.id}`}
            contextChip="پشتیبان حاجی‌عسل · پاسخ در همین صفحه نمایش داده می‌شود"
            onSend={send}
            onUpload={upload}
            onTyping={() => {
              void fetch(`/api/account/tickets/${params.id}`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ typing: true }),
              });
            }}
            className="min-h-[30rem]"
            headerActions={
              <button
                type="button"
                onClick={() => void toggleClose()}
                className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-primary transition hover:bg-surface-muted"
              >
                {ticket.status === "closed" || ticket.status === "resolved"
                  ? "بازگشایی"
                  : "بستن تیکت"}
              </button>
            }
          />
          {(ticket.status === "closed" || ticket.status === "resolved") &&
          !ticket.csatScore ? (
            <div className="rounded-2xl border border-border bg-surface p-4 text-center">
              <p className="mb-3 text-sm text-secondary">
                کیفیت پشتیبانی را امتیاز دهید
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => void sendCsat(n)}
                    className="h-10 w-10 rounded-xl border border-border text-sm font-medium hover:bg-gold-dim"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : loading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-border/40" />
      ) : (
        <p className="text-sm text-rose-600">{error || "تیکت یافت نشد"}</p>
      )}
    </div>
  );
}

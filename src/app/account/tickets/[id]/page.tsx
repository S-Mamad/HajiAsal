"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { TicketChat } from "@/components/tickets/TicketChat";
import { TicketCsatPrompt } from "@/components/tickets/TicketCsatPrompt";
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
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
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
        setTypingLabel(
          data.typing?.adminTyping ? "پشتیبان در حال نوشتن…" : null,
        );
      } catch {
        setError("خطا در بارگذاری");
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
    const res = await fetch(`/api/account/tickets/${params.id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق");
    await load({ silent: true });
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
    if (res.ok) await load({ silent: true });
  };

  const sendCsat = async (score: number) => {
    await fetch(`/api/account/tickets/${params.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csatScore: score, status: "closed" }),
    });
    await load({ silent: true });
  };

  const backLink = (
    <Link
      href={hajiasalPath("/account/tickets")}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 text-secondary transition hover:border-gold/30 hover:bg-surface-muted hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
      aria-label="بازگشت به تیکت‌ها"
    >
      <Icon icon={ArrowRight} size={18} />
    </Link>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface md:bg-transparent">
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
            layout="fullscreen"
            loading={loading}
            error={error || null}
            onRetryLoad={() => void load()}
            onPollUpdate={() => void load({ silent: true })}
            pollUrl={`/api/account/tickets/${ticket.id}`}
            typingLabel={typingLabel}
            headerLeading={backLink}
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
            className="min-h-0 flex-1"
            headerActions={
              <button
                type="button"
                onClick={() => void toggleClose()}
                className="h-10 rounded-xl border border-border px-3 text-xs font-medium text-primary transition hover:bg-surface-muted active:scale-[0.98]"
              >
                {ticket.status === "closed" || ticket.status === "resolved"
                  ? "بازگشایی"
                  : "بستن تیکت"}
              </button>
            }
          />
          {(ticket.status === "closed" || ticket.status === "resolved") &&
          !ticket.csatScore ? (
            <div className="relative z-[2] shrink-0 border-t border-border/80 bg-surface/95 p-3 backdrop-blur-md">
              <TicketCsatPrompt onSubmit={sendCsat} />
            </div>
          ) : null}
        </>
      ) : loading ? (
        <div className="flex h-full min-h-[20rem] flex-col gap-3 p-4">
          <div className="h-14 animate-pulse rounded-2xl bg-border/50" />
          <div className="ml-auto h-16 w-3/4 animate-pulse rounded-[1.15rem] bg-border/40" />
          <div className="mr-auto h-16 w-2/3 animate-pulse rounded-[1.15rem] bg-border/40" />
          <div className="mt-auto h-14 animate-pulse rounded-[1.35rem] bg-border/50" />
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {backLink}
          <p className="text-sm text-rose-600">{error || "تیکت یافت نشد"}</p>
        </div>
      )}
    </div>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { TicketChat } from "@/components/tickets/TicketChat";
import type { ChatMessage } from "@/components/tickets/chat-utils";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import type { TicketChannel } from "@/lib/tickets/types";

type TicketDetail = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  channel: TicketChannel;
  partyName?: string | null;
  partyPhone?: string | null;
  assignedTo?: string | null;
  sellerId?: string;
  customerId?: string | null;
};

function AdminTicketDetailInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const toast = useAdminToast();
  const channelHint = search.get("channel") ?? "";

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setError("");
    try {
      const qs = channelHint ? `?channel=${channelHint}` : "";
      const res = await fetch(`/api/admin/tickets/${params.id}${qs}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setTicket(data.ticket);
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [params.id, channelHint, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, channel: ticket.channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setTicket((t) => (t ? { ...t, ...data.item, channel: t.channel } : t));
      toast.success("به‌روزرسانی شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  const send = async (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
    replyToId?: string | null;
    isInternal?: boolean;
  }) => {
    if (!ticket) return;
    const res = await fetch(`/api/admin/tickets/${ticket.id}/reply`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        channel: ticket.channel,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق");
    await load();
  };

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "tickets");
    const res = await fetch("/api/admin/media", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق");
    const url = data.item?.url as string | undefined;
    if (!url) throw new Error("آدرس فایل دریافت نشد");
    return {
      url,
      name: data.item?.originalName ?? file.name,
      mimeType: data.item?.mimeType ?? file.type,
    };
  };

  useEffect(() => {
    if (!ticket) return;
    void fetch(`/api/admin/tickets/${ticket.id}/session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: ticket.channel,
        action: "acquire",
      }),
    });
    return () => {
      void fetch(`/api/admin/tickets/${ticket.id}/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: ticket.channel,
          action: "release",
        }),
      });
    };
  }, [ticket?.id, ticket?.channel]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={hajiasalPath("/admin/tickets")}
          className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-zinc-900"
        >
          <Icon icon={ArrowRight} size={16} />
          بازگشت به صندوق
        </Link>
      </div>

      {!ticket && loading ? (
        <div className="h-[28rem] animate-pulse rounded-xl bg-stone-100" />
      ) : ticket ? (
        <TicketChat
          ticketId={ticket.id}
          subject={ticket.subject}
          status={ticket.status}
          priority={ticket.priority}
          partyLabel={
            [ticket.partyName, ticket.partyPhone].filter(Boolean).join(" · ") ||
            null
          }
          channelLabel={ticket.channel === "seller" ? "فروشنده" : "مشتری"}
          messages={messages}
          selfSenderType="admin"
          variant="admin"
          loading={loading}
          error={error || null}
          onRetryLoad={() => void load()}
          onPollUpdate={() => void load({ silent: true })}
          pollUrl={`/api/admin/tickets/${ticket.id}`}
          allowInternal={ticket.channel === "customer"}
          className="min-h-[32rem]"
          onSend={send}
          onUpload={upload}
          onTyping={() => {
            void fetch(`/api/admin/tickets/${ticket.id}/session`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                channel: ticket.channel,
                action: "typing",
              }),
            });
          }}
          headerActions={
            <Can permission="tickets.manage">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs"
                  value={ticket.status}
                  disabled={saving}
                  onChange={(e) => void patch({ status: e.target.value })}
                >
                  <option value="open">باز</option>
                  <option value="waiting">در انتظار پشتیبانی</option>
                  <option value="pending">منتظر کاربر</option>
                  <option value="answered">پاسخ‌داده‌شده (قدیمی)</option>
                  <option value="resolved">حل‌شده</option>
                  <option value="closed">بسته</option>
                </select>
                <select
                  className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs"
                  value={ticket.priority}
                  disabled={saving}
                  onChange={(e) => void patch({ priority: e.target.value })}
                >
                  <option value="low">کم</option>
                  <option value="normal">عادی</option>
                  <option value="high">بالا</option>
                </select>
                {ticket.status === "closed" || ticket.status === "resolved" ? (
                  <AdminButton
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void patch({ status: "open" })}
                  >
                    بازگشایی
                  </AdminButton>
                ) : (
                  <AdminButton
                    size="sm"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void patch({ status: "closed" })}
                  >
                    بستن تیکت
                  </AdminButton>
                )}
              </div>
            </Can>
          }
        />
      ) : (
        <p className="text-sm text-rose-600">{error || "تیکت یافت نشد"}</p>
      )}
    </div>
  );
}

export default function AdminTicketDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[28rem] animate-pulse rounded-xl bg-stone-100" />
      }
    >
      <AdminTicketDetailInner />
    </Suspense>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatCircleDots, X } from "@phosphor-icons/react";
import { SupportGuestIdentityForm } from "@/components/support-fab/SupportGuestIdentityForm";
import { TicketChat } from "@/components/tickets/TicketChat";
import { TicketComposer } from "@/components/tickets/TicketComposer";
import type { ChatMessage } from "@/components/tickets/chat-utils";
import { Icon } from "@/components/ui/Icon";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { ticketSubjectForContext } from "@/lib/support-fab/context";
import {
  resolveSupportWidgetCopy,
  widgetGuestGreeting,
  widgetStatusCopy,
  widgetWelcomeLine,
} from "@/lib/support-fab/copy";
import { usePageCopy } from "@/hooks/usePageCopy";
import { planPanelOpenSync } from "@/lib/support-fab/panel-sync";
import { cn } from "@/lib/utils";
import type { SupportFabPanelProps, SupportHandshake } from "./types";

export default function SupportFabPanel({
  open,
  onClose,
  pageKind,
  productOutOfStock,
  handshake,
  onHandshake,
  onUnread,
}: SupportFabPanelProps) {
  const [ticketId, setTicketId] = useState<string | null>(
    handshake?.openTicketId ?? null,
  );
  const [ticket, setTicket] = useState<{
    id: string;
    subject: string;
    status: string;
    priority: string;
  } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [editIdentity, setEditIdentity] = useState(false);
  const handshakeFetchedRef = useRef(false);
  const contextPostedRef = useRef(false);

  const identified = Boolean(
    handshake?.identified ?? handshake?.authenticated ?? handshake?.user,
  );
  const withinHours = handshake?.withinHours !== false;
  const browserOnline =
    typeof navigator === "undefined" ? true : navigator.onLine;

  const siteSettings = useSiteSettings();
  const pageCopy = usePageCopy();
  const widgetCopy = useMemo(
    () => resolveSupportWidgetCopy(siteSettings),
    [siteSettings],
  );

  const greeting = useMemo(
    () =>
      widgetGuestGreeting(widgetCopy, {
        withinHours,
        operatorOnline: Boolean(handshake?.operatorOnline),
      }),
    [handshake?.operatorOnline, widgetCopy, withinHours],
  );

  const refreshHandshake = useCallback(async () => {
    const params = new URLSearchParams({
      pageKind,
      currentUrl: typeof window !== "undefined" ? window.location.href : "",
    });
    const res = await fetch(`/api/account/support-widget?${params}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = (await res.json()) as SupportHandshake;
    onHandshake(data);
    onUnread(data.unreadCount);
    if (!data.identified) {
      setTicketId(null);
      setTicket(null);
      setMessages([]);
      setEditIdentity(false);
      return data;
    }
    if (data.openTicketId) setTicketId(data.openTicketId);
    return data;
  }, [onHandshake, onUnread, pageKind]);

  const postContext = useCallback(async () => {
    const res = await fetch("/api/account/support-widget", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKind,
        currentUrl: window.location.href,
        productOutOfStock,
      }),
    });
    if (res.status === 401) {
      setTicketId(null);
      setTicket(null);
      setMessages([]);
      setEditIdentity(false);
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as SupportHandshake;
    onHandshake(data);
    onUnread(data.unreadCount ?? 0);
    if (!data.identified) {
      setTicketId(null);
      setTicket(null);
      setMessages([]);
      return;
    }
    if (data.openTicketId) setTicketId(data.openTicketId);
  }, [onHandshake, onUnread, pageKind, productOutOfStock]);

  useEffect(() => {
    if (!open) {
      handshakeFetchedRef.current = false;
      contextPostedRef.current = false;
      setEditIdentity(false);
      return;
    }
    const plan = planPanelOpenSync({
      open,
      handshakeFetched: handshakeFetchedRef.current,
      contextPosted: contextPostedRef.current,
      identified,
    });
    if (plan.fetchHandshake) {
      handshakeFetchedRef.current = true;
      void refreshHandshake().then((data) => {
        if (!data?.identified || contextPostedRef.current) return;
        contextPostedRef.current = true;
        void postContext();
      });
    }
    if (plan.postContext) {
      contextPostedRef.current = true;
      void postContext();
    }
  }, [open, identified, postContext, refreshHandshake]);

  const clearThread = useCallback(() => {
    setTicketId(null);
    setTicket(null);
    setMessages([]);
    setTypingLabel(null);
    setError(null);
  }, []);

  const loadTicket = useCallback(
    async (id: string, opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/account/tickets/${id}`, {
          credentials: "include",
        });
        if (res.status === 401 || res.status === 404) {
          clearThread();
          return;
        }
        if (!res.ok) {
          setError("گفتگو پیدا نشد");
          return;
        }
        const data = await res.json();
        setTicket(data.ticket);
        setMessages(data.messages ?? []);
        setTypingLabel(
          data.typing?.adminTyping ? "پشتیبان در حال نوشتن…" : null,
        );
        // Non-silent open marks the thread read — refresh FAB unread badge.
        if (!opts?.silent) {
          void refreshHandshake();
        }
      } catch {
        setError("خطا در بارگذاری گفتگو");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [clearThread, refreshHandshake],
  );

  useEffect(() => {
    if (!open || !ticketId || !identified) return;
    if (ticketId.startsWith("pending_")) return;
    void loadTicket(ticketId);
  }, [open, ticketId, identified, loadTicket]);

  // Drop stale thread if identity was cleared (cookie expired / logout).
  useEffect(() => {
    if (!identified && !editIdentity) {
      clearThread();
    }
  }, [identified, editIdentity, clearThread]);

  const registerGuest = async (input: { fullName: string; phone: string }) => {
    setGuestBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/support-guest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        guest?: { fullName: string; phone: string };
        user?: { fullName: string; phone: string };
      };
      if (!res.ok) {
        throw new Error(
          typeof data.message === "string" ? data.message : "ثبت مشخصات ناموفق بود",
        );
      }
      const identity = data.user ?? data.guest;
      const nextPhone = identity?.phone ?? input.phone;
      const phoneChanged =
        Boolean(handshake?.user?.phone) &&
        handshake?.user?.phone !== nextPhone;
      if (phoneChanged) {
        clearThread();
      }
      // Optimistic: cookie is set; don't leave UI stuck if refresh fails.
      onHandshake({
        authenticated: false,
        identified: true,
        kind: "guest",
        withinHours,
        operatorOnline: Boolean(handshake?.operatorOnline),
        unreadCount: phoneChanged ? 0 : (handshake?.unreadCount ?? 0),
        openTicketId: phoneChanged ? null : (handshake?.openTicketId ?? null),
        pendingPaymentCount: 0,
        shippingOrderId: null,
        accountValue: 0,
        vip: false,
        vipSummary: null,
        user: identity
          ? { fullName: identity.fullName, phone: identity.phone }
          : { fullName: input.fullName, phone: input.phone },
        currentUrl:
          typeof window !== "undefined" ? window.location.href : null,
        pageKind,
      });
      setEditIdentity(false);
      contextPostedRef.current = true;
      const next = await refreshHandshake();
      void postContext();
      if (next?.openTicketId && !phoneChanged) {
        setTicketId(next.openTicketId);
      }
    } finally {
      setGuestBusy(false);
    }
  };

  const sendExisting = async (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
    replyToId?: string | null;
  }) => {
    if (!ticketId || ticketId.startsWith("pending_")) return;
    const res = await fetch(`/api/account/tickets/${ticketId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.status === 401 || res.status === 404) {
      clearThread();
      void refreshHandshake();
      throw new Error("جلسه منقضی شده؛ دوباره مشخصات را وارد کنید");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق");
    await loadTicket(ticketId, { silent: true });
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

  const createFromComposer = async (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
  }) => {
    setCreating(true);
    setError(null);
    const subject = ticketSubjectForContext({
      pageKind,
      productOutOfStock,
      hasShippingOrder: Boolean(handshake?.shippingOrderId),
    });
    const now = new Date().toISOString();
    const optimisticId = `pending_${input.clientMessageId}`;
    const optimisticGreeting: ChatMessage = {
      id: `${optimisticId}_g`,
      senderType: "system",
      body: greeting,
      createdAt: now,
      delivery: "sent",
    };
    const optimisticCustomer: ChatMessage = {
      id: `${optimisticId}_c`,
      senderType: "customer",
      body: input.body || "پیوست",
      attachmentUrl: input.attachmentUrl ?? null,
      attachmentName: input.attachmentName ?? null,
      attachmentMime: input.attachmentMime ?? null,
      clientMessageId: input.clientMessageId,
      createdAt: now,
      delivery: "sending",
      pending: true,
    };
    setTicketId(optimisticId);
    setTicket({
      id: optimisticId,
      subject,
      status: "open",
      priority: "normal",
    });
    setMessages([optimisticGreeting, optimisticCustomer]);
    try {
      const res = await fetch("/api/account/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body: input.body || "پیوست",
          priority: "normal",
          meta: {
            source: "support-fab",
            currentUrl: window.location.href,
            pageKind,
            productOutOfStock,
            clientMessageId: input.clientMessageId,
            attachmentUrl: input.attachmentUrl,
            attachmentName: input.attachmentName,
            attachmentMime: input.attachmentMime,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearThread();
        void refreshHandshake();
        throw new Error("جلسه منقضی شده؛ دوباره مشخصات را وارد کنید");
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "ارسال ناموفق",
        );
      }
      const id = data.id as string;
      if (!id) throw new Error("شناسه گفتگو دریافت نشد");
      const serverMessages = Array.isArray(data.messages)
        ? (data.messages as ChatMessage[])
        : null;
      setTicketId(id);
      setTicket(
        data.ticket
          ? {
              id: data.ticket.id ?? id,
              subject: data.ticket.subject ?? subject,
              status: data.ticket.status ?? "waiting",
              priority: data.ticket.priority ?? "normal",
            }
          : { id, subject, status: "waiting", priority: "normal" },
      );
      if (serverMessages?.length) {
        setMessages(serverMessages);
      } else {
        void loadTicket(id, { silent: true });
      }
      void refreshHandshake();
    } catch (err) {
      setTicketId(null);
      setTicket(null);
      setMessages([]);
      setError(err instanceof Error ? err.message : "ارسال ناموفق بود");
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const statusCopy = widgetStatusCopy(widgetCopy, {
    withinHours,
    operatorOnline: Boolean(handshake?.operatorOnline),
    browserOnline,
  });

  const welcomeLine = useMemo(
    () =>
      widgetWelcomeLine(widgetCopy, {
        withinHours,
        operatorOnline: Boolean(handshake?.operatorOnline),
      }),
    [handshake?.operatorOnline, widgetCopy, withinHours],
  );

  const inThread = Boolean(ticketId && identified);

  return (
    <div
      className={cn(
        "support-fab-panel flex h-full min-h-0 flex-col text-primary",
        inThread ? "bg-transparent" : "ticket-chat-canvas",
      )}
    >
      {inThread ? (
        <TicketChat
          ticketId={ticket?.id ?? ticketId!}
          subject={ticket?.subject ?? pageCopy.support.panelTitle}
          status={ticket?.status ?? "open"}
          priority={ticket?.priority ?? "normal"}
          messages={messages}
          selfSenderType="customer"
          variant="storefront"
          layout="widget"
          loading={loading && messages.length === 0}
          error={error}
          onRetryLoad={() =>
            ticketId && !ticketId.startsWith("pending_")
              ? void loadTicket(ticketId)
              : undefined
          }
          onPollUpdate={() =>
            ticketId && !ticketId.startsWith("pending_")
              ? void loadTicket(ticketId, { silent: true })
              : undefined
          }
          pollUrl={
            ticketId && !ticketId.startsWith("pending_")
              ? `/api/account/tickets/${ticketId}`
              : null
          }
          typingLabel={typingLabel}
          contextChip={handshake?.vip ? "پشتیبانی اختصاصی" : null}
          headerLeading={
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-secondary transition hover:bg-surface-muted hover:text-primary"
              aria-label="بستن پشتیبانی"
            >
              <Icon icon={X} size={18} />
            </button>
          }
          onSend={sendExisting}
          onUpload={upload}
          onTyping={() => {
            if (!ticketId || ticketId.startsWith("pending_")) return;
            void fetch(`/api/account/tickets/${ticketId}`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ typing: true }),
            });
          }}
          className="min-h-0 flex-1 rounded-none shadow-none"
        />
      ) : (
        <>
          <header className="relative z-[2] flex shrink-0 items-center gap-3 border-b border-border/60 bg-surface/90 px-3 py-3 backdrop-blur-md">
            <span
              className={cn(
                "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                browserOnline ? "bg-gold-dim text-gold" : "bg-surface-muted text-dim",
              )}
            >
              <Icon icon={ChatCircleDots} size={20} weight="fill" />
              {browserOnline && withinHours ? (
                <span
                  className={cn(
                    "pointer-events-none absolute end-[3px] bottom-[3px] h-2 w-2 rounded-full ring-[2px] ring-surface",
                    handshake?.operatorOnline ? "bg-emerald-500" : "bg-gold",
                  )}
                  aria-hidden
                />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight">
                {pageCopy.support.panelTitle}
              </p>
              <p className="mt-1 truncate text-[11px] text-secondary">
                {statusCopy}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-secondary transition hover:bg-surface-muted hover:text-primary"
              aria-label="بستن پشتیبانی"
            >
              <Icon icon={X} size={18} />
            </button>
          </header>

          {!identified || editIdentity ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              <SupportGuestIdentityForm
                greeting={greeting}
                busy={guestBusy}
                error={error}
                initialFullName={handshake?.user?.fullName ?? ""}
                initialPhone={handshake?.user?.phone ?? ""}
                allowCancel={editIdentity && identified}
                onCancel={() => setEditIdentity(false)}
                onSubmit={registerGuest}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <div className="mx-auto flex max-w-sm flex-col gap-5">
                  <div className="space-y-2 text-center">
                    <p className="text-[15px] font-semibold tracking-tight text-primary">
                      {handshake?.user?.fullName
                        ? `سلام ${handshake.user.fullName}`
                        : "سلام"}
                    </p>
                    <p className="text-[13px] leading-6 text-secondary">
                      {welcomeLine}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px]",
                        !browserOnline
                          ? "bg-stone-100 text-stone-600"
                          : withinHours && handshake?.operatorOnline
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-gold-dim text-gold",
                      )}
                    >
                      {statusCopy}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-center text-[11px] text-secondary/80">
                      {pageCopy.support.quickPromptsSection}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {pageCopy.support.quickPrompts.map((prompt) => (
                        <button
                          key={prompt.id}
                          type="button"
                          disabled={!browserOnline || creating}
                          onClick={() => {
                            if (!prompt.body) {
                              const el =
                                document.querySelector<HTMLTextAreaElement>(
                                  ".support-fab-panel textarea",
                                );
                              el?.focus();
                              return;
                            }
                            void createFromComposer({
                              body: prompt.body,
                              clientMessageId:
                                typeof crypto !== "undefined" &&
                                crypto.randomUUID
                                  ? crypto.randomUUID()
                                  : `c_${Date.now()}`,
                            });
                          }}
                          className="rounded-xl border border-border/45 bg-surface/90 px-3 py-2.5 text-[12px] text-primary transition hover:border-gold/35 hover:bg-gold-dim/50 disabled:opacity-50"
                        >
                          {prompt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {handshake?.kind === "guest" && handshake.user ? (
                    <button
                      type="button"
                      className="mx-auto block text-[11px] text-secondary underline-offset-2 hover:text-gold hover:underline"
                      onClick={() => setEditIdentity(true)}
                    >
                      ویرایش نام یا شماره
                    </button>
                  ) : null}

                  {error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] leading-6 text-rose-800">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>

              <TicketComposer
                variant="storefront"
                sending={creating}
                disabled={!browserOnline}
                compact
                placeholder={pageCopy.support.composerPlaceholder}
                onSend={createFromComposer}
                onUpload={upload}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

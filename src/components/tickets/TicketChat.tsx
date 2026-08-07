"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WifiSlash } from "@phosphor-icons/react";
import { TicketComposer } from "./TicketComposer";
import { TicketMessageList } from "./TicketMessageList";
import { TicketThreadHeader } from "./TicketThreadHeader";
import {
  shellClass,
  type ChatMessage,
  type TicketChatLayout,
  type TicketChatVariant,
} from "./chat-utils";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_CANNED } from "@/lib/tickets/types";

type Props = {
  ticketId: string;
  subject: string;
  status: string;
  priority?: string;
  partyLabel?: string | null;
  channelLabel?: string | null;
  messages: ChatMessage[];
  selfSenderType: string;
  variant?: TicketChatVariant;
  layout?: TicketChatLayout;
  loading?: boolean;
  error?: string | null;
  onRetryLoad?: () => void;
  headerActions?: React.ReactNode;
  headerLeading?: React.ReactNode;
  className?: string;
  allowInternal?: boolean;
  pollUrl?: string | null;
  typingLabel?: string | null;
  lockLabel?: string | null;
  presenceLabel?: string | null;
  contextChip?: string | null;
  canned?: Array<{ shortcut: string; title: string; body: string }>;
  onSend: (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
    replyToId?: string | null;
    isInternal?: boolean;
  }) => Promise<void>;
  onUpload?: (file: File) => Promise<{
    url: string;
    name?: string;
    mimeType?: string;
  }>;
  onTyping?: () => void;
  onPollUpdate?: () => void;
};

export function TicketChat({
  ticketId,
  subject,
  status,
  priority,
  partyLabel,
  channelLabel,
  messages,
  selfSenderType,
  variant = "admin",
  layout = "embedded",
  loading,
  error,
  onRetryLoad,
  headerActions,
  headerLeading,
  className,
  allowInternal,
  pollUrl,
  typingLabel,
  lockLabel,
  presenceLabel,
  contextChip,
  canned = DEFAULT_CANNED,
  onSend,
  onUpload,
  onTyping,
  onPollUpdate,
}: Props) {
  const [sending, setSending] = useState(false);
  const [localError, setLocalError] = useState("");
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [muted, setMuted] = useState(false);
  const lastCount = useRef(messages.length);
  const tabId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab_${Date.now()}`,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!pollUrl || !onPollUpdate) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") onPollUpdate();
    }, 4000);
    return () => window.clearInterval(id);
  }, [pollUrl, onPollUpdate]);

  useEffect(() => {
    if (messages.length <= lastCount.current) {
      lastCount.current = messages.length;
      return;
    }
    lastCount.current = messages.length;
    try {
      const bc = new BroadcastChannel("hajiasal-ticket-chat");
      bc.postMessage({
        type: "msg",
        ticketId,
        tabId: tabId.current,
        count: messages.length,
      });
      bc.close();
    } catch {
      /* ignore */
    }
    if (muted) return;
    if (document.visibilityState === "visible") return;
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.03;
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch {
      /* ignore */
    }
  }, [messages.length, muted, ticketId]);

  const displayMessages = useMemo(() => {
    const ids = new Set(messages.map((m) => m.id));
    const clientIds = new Set(
      messages
        .map((m) => m.clientMessageId)
        .filter((id): id is string => Boolean(id)),
    );
    const extras = pending.filter((p) => {
      if (ids.has(p.id)) return false;
      if (p.clientMessageId && clientIds.has(p.clientMessageId)) return false;
      return p.pending || p.failed;
    });
    const visible =
      selfSenderType === "admin"
        ? [...messages, ...extras]
        : [...messages, ...extras].filter((m) => !m.isInternal);
    return visible;
  }, [messages, pending, selfSenderType]);

  const handleSend = useCallback(
    async (input: {
      body: string;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
      attachmentMime?: string | null;
      clientMessageId: string;
      replyToId?: string | null;
      isInternal?: boolean;
    }) => {
      if (status === "closed" || status === "resolved") return;
      if (!online) {
        setLocalError("اتصال اینترنت قطع است");
        return;
      }
      setSending(true);
      setLocalError("");
      const optimistic: ChatMessage = {
        id: input.clientMessageId,
        clientKey: input.clientMessageId,
        clientMessageId: input.clientMessageId,
        senderType: selfSenderType,
        body: input.body,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentName: input.attachmentName,
        attachmentMime: input.attachmentMime,
        replyToId: input.replyToId,
        isInternal: input.isInternal,
        createdAt: new Date().toISOString(),
        pending: true,
        delivery: "sending",
      };
      setPending((prev) => [
        ...prev.filter((p) => p.clientMessageId !== input.clientMessageId),
        optimistic,
      ]);
      try {
        await onSend(input);
        setPending((prev) =>
          prev.filter((p) => p.clientMessageId !== input.clientMessageId),
        );
      } catch (err) {
        setPending((prev) =>
          prev.map((p) =>
            p.clientMessageId === input.clientMessageId
              ? { ...p, pending: false, failed: true, delivery: "failed" }
              : p,
          ),
        );
        setLocalError(err instanceof Error ? err.message : "ارسال ناموفق بود");
      } finally {
        setSending(false);
      }
    },
    [onSend, online, selfSenderType, status],
  );

  const retry = (msg: ChatMessage) => {
    const clientMessageId = msg.clientMessageId ?? crypto.randomUUID();
    setPending((prev) =>
      prev.filter(
        (p) => p.id !== msg.id && p.clientMessageId !== msg.clientMessageId,
      ),
    );
    void handleSend({
      body: msg.body,
      attachmentUrl: msg.attachmentUrl,
      attachmentName: msg.attachmentName,
      attachmentMime: msg.attachmentMime,
      clientMessageId,
      replyToId: msg.replyToId,
      isInternal: msg.isInternal,
    });
  };

  const isFullscreen = layout === "fullscreen";

  return (
    <div className={cn(shellClass(variant, layout), className)}>
      <TicketThreadHeader
        subject={subject}
        status={status}
        priority={priority}
        partyLabel={partyLabel}
        channelLabel={channelLabel}
        variant={variant}
        leading={headerLeading}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        compact={isFullscreen}
        actions={headerActions}
      />

      {contextChip && !isFullscreen ? (
        <div
          className={cn(
            "shrink-0 border-b px-4 py-1.5 text-[11px]",
            variant === "storefront"
              ? "border-border bg-surface-muted/50 text-secondary"
              : "border-stone-100 bg-stone-50 text-stone-600",
          )}
        >
          {contextChip}
        </div>
      ) : null}
      {lockLabel ? (
        <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
          {lockLabel}
        </div>
      ) : null}
      {presenceLabel ? (
        <div className="shrink-0 border-b border-stone-100 px-4 py-1 text-[11px] text-stone-500">
          {presenceLabel}
        </div>
      ) : null}
      {!online ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <Icon icon={WifiSlash} size={16} />
          اتصال قطع است. پس از وصل شدن، ارسال از سر گرفته می‌شود
        </div>
      ) : null}

      {error ? (
        <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
          {onRetryLoad ? (
            <button type="button" className="ms-2 underline" onClick={onRetryLoad}>
              تلاش مجدد
            </button>
          ) : null}
        </div>
      ) : null}
      {localError ? (
        <div className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {localError}
        </div>
      ) : null}

      <TicketMessageList
        messages={displayMessages}
        selfSenderType={selfSenderType}
        variant={variant}
        loading={loading}
        onReply={setReplyTo}
        onRetry={retry}
      />

      {typingLabel ? (
        <p
          className={cn(
            "shrink-0 px-4 pb-1 text-[11px]",
            variant === "storefront" ? "text-secondary" : "text-stone-500",
          )}
        >
          {typingLabel}
        </p>
      ) : null}

      <div className="shrink-0">
        <TicketComposer
          variant={variant}
          ticketId={ticketId}
          roleKey={selfSenderType}
          sending={sending}
          closed={status === "closed" || status === "resolved"}
          disabled={!online}
          allowInternal={allowInternal}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          canned={selfSenderType === "admin" ? canned : []}
          onTyping={onTyping}
          onSend={handleSend}
          onUpload={onUpload}
        />
      </div>
    </div>
  );
}

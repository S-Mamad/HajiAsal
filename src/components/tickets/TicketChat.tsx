"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WifiSlash, WarningCircle } from "@phosphor-icons/react";
import { TicketComposer } from "./TicketComposer";
import { TicketMessageList } from "./TicketMessageList";
import { TicketThreadHeader } from "./TicketThreadHeader";
import {
  isStoreMessengerLayout,
  shellClass,
  storefrontThreadKicker,
  storefrontThreadTitle,
  type ChatMessage,
  type TicketChatLayout,
  type TicketChatVariant,
} from "./chat-utils";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_CANNED } from "@/lib/tickets/types";
import { useVisualViewportOffset } from "@/hooks/useVisualViewportOffset";
import { ticketHaptic } from "@/lib/tickets/haptic";

const BC_NAME = "hajiasal-ticket-chat";

type Props = {
  ticketId: string;
  subject: string;
  status: string;
  priority?: string;
  partyLabel?: string | null;
  /** Name shown on customer bubbles in admin (and similar). */
  counterpartName?: string | null;
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
  counterpartName = null,
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
  const soundClaimed = useRef(0);
  const tabId = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab_${Date.now()}`,
  );
  const bcRef = useRef<BroadcastChannel | null>(null);
  const isStore = variant === "storefront";
  const isFullscreen = layout === "fullscreen";
  const isWidget = layout === "widget";
  const isMessenger = isStoreMessengerLayout(variant, layout);
  const keyboardOffset = useVisualViewportOffset();
  // Fullscreen account shell already shrinks with the keyboard; only the FAB widget
  // needs composer-level padding.
  const appliedKeyboard = isWidget ? keyboardOffset : 0;

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
    try {
      const bc = new BroadcastChannel(BC_NAME);
      bcRef.current = bc;
      bc.onmessage = (event: MessageEvent) => {
        const data = event.data as {
          type?: string;
          ticketId?: string;
          tabId?: string;
          count?: number;
          muted?: boolean;
        };
        if (!data || data.tabId === tabId.current) return;
        if (data.ticketId !== ticketId) return;
        if (data.type === "mute" && typeof data.muted === "boolean") {
          setMuted(data.muted);
        }
        if (data.type === "sound" && typeof data.count === "number") {
          soundClaimed.current = data.count;
        }
      };
      return () => {
        bc.close();
        bcRef.current = null;
      };
    } catch {
      return;
    }
  }, [ticketId]);

  useEffect(() => {
    if (!pollUrl || !onPollUpdate) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") onPollUpdate();
    }, isWidget ? 2500 : 4000);
    return () => window.clearInterval(id);
  }, [pollUrl, onPollUpdate, isWidget]);

  useEffect(() => {
    if (messages.length <= lastCount.current) {
      lastCount.current = messages.length;
      return;
    }
    const prev = lastCount.current;
    lastCount.current = messages.length;

    try {
      bcRef.current?.postMessage({
        type: "msg",
        ticketId,
        tabId: tabId.current,
        count: messages.length,
      });
    } catch {
      /* ignore */
    }

    if (document.visibilityState === "visible") {
      ticketHaptic(40);
      return;
    }

    if (muted) return;
    if (soundClaimed.current >= messages.length) return;

    try {
      bcRef.current?.postMessage({
        type: "sound",
        ticketId,
        tabId: tabId.current,
        count: messages.length,
      });
      soundClaimed.current = messages.length;
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

    void prev;
  }, [messages.length, muted, ticketId]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        bcRef.current?.postMessage({
          type: "mute",
          ticketId,
          tabId: tabId.current,
          muted: next,
        });
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [ticketId]);

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
        ticketHaptic(50);
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

  const banner = (className: string, content: React.ReactNode) => (
    <div
      className={cn(
        "relative z-[1] shrink-0 px-3 py-2 text-xs sm:text-sm",
        className,
      )}
    >
      {content}
    </div>
  );

  return (
    <div className={cn(shellClass(variant, layout), className)}>
      <TicketThreadHeader
        subject={isMessenger ? storefrontThreadTitle() : subject}
        status={status}
        priority={isMessenger ? undefined : priority}
        partyLabel={
          isMessenger
            ? storefrontThreadKicker(subject) ?? partyLabel
            : partyLabel
        }
        channelLabel={isMessenger ? null : channelLabel}
        variant={variant}
        leading={headerLeading}
        muted={muted}
        onToggleMute={isWidget ? undefined : toggleMute}
        compact={isFullscreen || isWidget}
        minimal={isWidget}
        actions={headerActions}
      />

      {contextChip && !isFullscreen && !isWidget
        ? banner(
            isStore
              ? "bg-surface/70 text-secondary"
              : "bg-stone-50 text-stone-600",
            contextChip,
          )
        : null}
      {lockLabel
        ? banner(
            "sticky top-0 z-[5] bg-amber-100/95 text-amber-950 shadow-[0_8px_20px_-16px_rgb(180_83_9/0.45)] backdrop-blur-sm",
            lockLabel,
          )
        : null}
      {presenceLabel
        ? banner(
            isStore ? "bg-transparent text-secondary" : "text-stone-500",
            presenceLabel,
          )
        : null}
      {!online
        ? banner(
            "flex items-center gap-2 bg-amber-50 text-amber-950",
            <>
              <Icon icon={WifiSlash} size={16} />
              اتصال قطع است. پیام‌های ارسال‌نشده را با «تلاش مجدد» بفرستید
            </>,
          )
        : null}

      {error
        ? banner(
            "flex flex-wrap items-center gap-2 bg-rose-50 text-rose-800",
            <>
              <Icon icon={WarningCircle} size={16} />
              <span className="min-w-0 flex-1">{error}</span>
              {onRetryLoad ? (
                <button
                  type="button"
                  className="min-h-11 rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-medium underline-offset-2 hover:underline"
                  onClick={onRetryLoad}
                >
                  تلاش مجدد
                </button>
              ) : null}
            </>,
          )
        : null}
      {localError
        ? banner("bg-rose-50 text-rose-800", localError)
        : null}

      <TicketMessageList
        messages={displayMessages}
        selfSenderType={selfSenderType}
        variant={variant}
        loading={loading}
        onReply={setReplyTo}
        onRetry={retry}
        compact={isMessenger}
        counterpartName={counterpartName}
      />

      {typingLabel ? (
        <p
          className={cn(
            "relative z-[1] shrink-0 px-4 pb-1.5 text-[11px] font-light",
            isStore ? "text-secondary" : "text-stone-500",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="flex gap-0.5" aria-hidden>
              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:120ms]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:240ms]" />
            </span>
            {typingLabel}
          </span>
        </p>
      ) : null}

      <div className="relative z-[1] shrink-0">
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
          keyboardOffset={appliedKeyboard}
          compact={isMessenger}
          omitBottomSafeArea={isFullscreen}
          onSend={handleSend}
          onUpload={onUpload}
        />
      </div>
    </div>
  );
}

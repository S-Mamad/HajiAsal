"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, ChatCircleDots } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import {
  dayKey,
  formatDayLabel,
  type ChatMessage,
  type TicketChatVariant,
} from "./chat-utils";
import { TicketMessageBubble } from "./TicketMessageBubble";
import { cn } from "@/lib/utils";

type Props = {
  messages: ChatMessage[];
  selfSenderType: string;
  variant: TicketChatVariant;
  loading?: boolean;
  onReply?: (message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
  onLoadOlder?: () => Promise<void> | void;
  hasOlder?: boolean;
};

export function TicketMessageList({
  messages,
  selfSenderType,
  variant,
  loading,
  onReply,
  onRetry,
  onLoadOlder,
  hasOlder,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const prevLen = useRef(messages.length);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickRef.current = distance < 80;
      if (stickRef.current) setUnseen(0);
      if (el.scrollTop < 40 && hasOlder && onLoadOlder) {
        void onLoadOlder();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasOlder, onLoadOlder]);

  useEffect(() => {
    if (messages.length > prevLen.current) {
      if (stickRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setUnseen(0);
      } else {
        setUnseen((n) => n + (messages.length - prevLen.current));
      }
    }
    prevLen.current = messages.length;
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-14 animate-pulse rounded-2xl",
                variant === "storefront" ? "bg-border/60" : "bg-stone-200",
                i % 2 === 0 ? "mr-auto w-3/4" : "ml-auto w-2/3",
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <Icon
          icon={ChatCircleDots}
          size={36}
          className={variant === "storefront" ? "text-secondary" : "text-stone-400"}
        />
        <p
          className={cn(
            "text-sm",
            variant === "storefront" ? "text-secondary" : "text-stone-500",
          )}
        >
          هنوز پیامی نیست. اولین پیام را بنویسید.
        </p>
      </div>
    );
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  let lastDay = "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasOlder ? (
          <button
            type="button"
            className="mx-auto block text-xs text-stone-500 underline"
            onClick={() => void onLoadOlder?.()}
          >
            بارگذاری پیام‌های قدیمی‌تر
          </button>
        ) : null}
        {messages.map((m) => {
          const key = dayKey(m.createdAt);
          const showDay = key !== lastDay;
          lastDay = key;
          const replyPreview = m.replyToId ? byId.get(m.replyToId) : null;
          return (
            <div key={m.clientKey ?? m.id} className="space-y-3">
              {showDay ? (
                <div className="flex justify-center py-1">
                  <span
                    className={cn(
                      "rounded-full px-3 py-0.5 text-[11px]",
                      variant === "storefront"
                        ? "bg-border/70 text-secondary"
                        : "bg-stone-200/80 text-stone-600",
                    )}
                  >
                    {formatDayLabel(m.createdAt)}
                  </span>
                </div>
              ) : null}
              <TicketMessageBubble
                message={m}
                selfSenderType={selfSenderType}
                variant={variant}
                replyPreview={replyPreview}
                onReply={onReply}
                onRetry={onRetry}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {unseen > 0 ? (
        <button
          type="button"
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-lg"
          onClick={() => {
            stickRef.current = true;
            setUnseen(0);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          {unseen} پیام جدید
          <Icon icon={CaretDown} size={12} />
        </button>
      ) : null}
    </div>
  );
}

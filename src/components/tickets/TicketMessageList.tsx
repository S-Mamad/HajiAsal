"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, ChatTeardropDots } from "@phosphor-icons/react";
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
  const isStore = variant === "storefront";

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickRef.current = distance < 96;
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
    } else if (messages.length > 0 && prevLen.current === 0) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
    prevLen.current = messages.length;
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="relative z-[1] flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-16 animate-pulse rounded-[1.15rem]",
                isStore ? "bg-surface/70" : "bg-stone-200",
                i % 2 === 0 ? "mr-auto w-[78%]" : "ml-auto w-[68%]",
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return (
      <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-[1.35rem]",
            isStore ? "bg-gold-dim text-gold" : "bg-stone-100 text-stone-400",
          )}
        >
          <Icon icon={ChatTeardropDots} size={32} weight="duotone" />
        </div>
        <div className="space-y-1">
          <p
            className={cn(
              "text-sm font-medium",
              isStore ? "text-primary" : "text-zinc-800",
            )}
          >
            گفتگو را شروع کنید
          </p>
          <p
            className={cn(
              "text-xs leading-relaxed",
              isStore ? "text-secondary" : "text-stone-500",
            )}
          >
            اولین پیام را بنویسید تا پشتیبانی پاسخ دهد.
          </p>
        </div>
      </div>
    );
  }

  const byId = new Map(messages.map((m) => [m.id, m]));
  let lastDay = "";

  return (
    <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-3 py-3 sm:space-y-3 sm:px-4 sm:py-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasOlder ? (
          <button
            type="button"
            className={cn(
              "mx-auto block rounded-full px-3 py-1.5 text-xs transition",
              isStore
                ? "bg-surface/80 text-secondary ring-1 ring-border hover:text-primary"
                : "bg-white text-stone-500 ring-1 ring-stone-200",
            )}
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
            <div key={m.clientKey ?? m.id} className="space-y-2.5">
              {showDay ? (
                <div className="sticky top-1 z-[2] flex justify-center py-1">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm",
                      isStore
                        ? "bg-surface/85 text-secondary ring-1 ring-border/70"
                        : "bg-stone-200/90 text-stone-600",
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
        <div ref={bottomRef} className="h-1" />
      </div>

      {unseen > 0 ? (
        <button
          type="button"
          className={cn(
            "absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg transition active:scale-[0.97]",
            isStore
              ? "bg-primary text-void"
              : "bg-zinc-900 text-white",
          )}
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

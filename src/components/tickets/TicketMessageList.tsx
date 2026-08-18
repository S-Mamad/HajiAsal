"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, ChatTeardropDots } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import {
  computeMessageGroupFlags,
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
  compact?: boolean;
  counterpartName?: string | null;
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
  compact = false,
  counterpartName = null,
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
      const el = scrollerRef.current;
      if (stickRef.current && el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
        setUnseen(0);
      } else {
        setUnseen((n) => n + (messages.length - prevLen.current));
      }
    } else if (messages.length > 0 && prevLen.current === 0) {
      const el = scrollerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
      }
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
                "h-16 animate-pulse rounded-2xl",
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
              "text-xs font-light leading-relaxed",
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
        className={cn(
          "flex-1 overflow-y-auto overscroll-y-contain touch-pan-y",
          compact ? "px-3.5 py-3" : "px-3 py-3 sm:px-4 sm:py-4",
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasOlder ? (
          <button
            type="button"
            className={cn(
              "mx-auto mb-3 block rounded-full px-3 py-1.5 text-xs transition",
              isStore
                ? "bg-surface/80 text-secondary shadow-sm hover:text-primary"
                : "bg-white text-stone-500 shadow-sm",
            )}
            onClick={() => void onLoadOlder?.()}
          >
            بارگذاری پیام‌های قدیمی‌تر
          </button>
        ) : null}
        {messages.map((m, index) => {
          const key = dayKey(m.createdAt);
          const showDay = key !== lastDay;
          lastDay = key;
          const replyPreview = m.replyToId ? byId.get(m.replyToId) : null;
          const group = computeMessageGroupFlags(messages, index);
          return (
            <div key={m.clientKey ?? m.id}>
              {showDay ? (
                <div className="flex justify-center py-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-medium shadow-[0_8px_20px_-14px_rgb(28_25_23/0.3)]",
                      isStore
                        ? "bg-surface/80 text-secondary shadow-[0_8px_16px_-12px_rgb(28_25_23/0.2)]"
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
                group={group}
                onReply={onReply}
                onRetry={onRetry}
                compact={compact}
                counterpartName={counterpartName}
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
            "absolute bottom-3 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg transition active:scale-[0.97]",
            isStore ? "bg-primary text-void" : "bg-zinc-900 text-white",
          )}
          onClick={() => {
            stickRef.current = true;
            setUnseen(0);
            const el = scrollerRef.current;
            if (el) {
              el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            }
          }}
        >
          {unseen} پیام جدید
          <Icon icon={CaretDown} size={12} />
        </button>
      ) : null}
    </div>
  );
}

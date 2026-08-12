"use client";

import Image from "next/image";
import {
  ArrowBendUpLeft,
  Checks,
  Check,
  WarningCircle,
  SpinnerGap,
  FilePdf,
  Paperclip,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  bubbleTone,
  formatMessageTime,
  renderLightMarkdown,
  senderLabel,
  type ChatMessage,
  type TicketChatVariant,
} from "./chat-utils";

type Props = {
  message: ChatMessage;
  selfSenderType: string;
  variant: TicketChatVariant;
  replyPreview?: ChatMessage | null;
  onReply?: (message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
};

export function TicketMessageBubble({
  message,
  selfSenderType,
  variant,
  replyPreview,
  onReply,
  onRetry,
}: Props) {
  const isSystem = message.senderType === "system";
  const isSelf = message.senderType === selfSenderType;
  const isImage =
    !!message.attachmentUrl &&
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(message.attachmentUrl);
  const isPdf =
    !!message.attachmentUrl &&
    (message.attachmentMime === "application/pdf" ||
      /\.pdf(\?|$)/i.test(message.attachmentUrl));

  if (isSystem) {
    return (
      <div className="flex justify-center px-2 py-1">
        <p
          className={cn(
            "max-w-[90%] rounded-full px-3.5 py-1 text-center text-[11px] leading-relaxed",
            variant === "storefront"
              ? "bg-surface/80 text-secondary ring-1 ring-border/60"
              : "bg-stone-200/70 text-stone-600",
          )}
        >
          {message.body}
        </p>
      </div>
    );
  }

  if (message.deletedAt) {
    return (
      <div className={cn("flex w-full", isSelf ? "justify-start" : "justify-end")}>
        <p className="rounded-2xl border border-dashed border-stone-300/80 bg-surface/40 px-3 py-2 text-xs italic text-stone-400">
          پیام حذف شد
        </p>
      </div>
    );
  }

  const metaMuted = isSelf
    ? variant === "storefront"
      ? "text-primary/65"
      : message.isInternal
        ? "text-amber-800/70"
        : "text-white/65"
    : "text-secondary";

  return (
    <div
      className={cn(
        "group flex w-full items-end gap-2",
        isSelf ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "relative max-w-[min(88%,22rem)] px-3.5 py-2.5 text-[13.5px] sm:max-w-[min(100%,28rem)] sm:text-sm",
          "rounded-[1.15rem]",
          isSelf ? "rounded-ee-md" : "rounded-es-md",
          bubbleTone(isSelf, variant, message.isInternal, false),
          message.pending && "opacity-75",
          message.failed && "ring-2 ring-rose-400/70",
        )}
      >
        <div className={cn("mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px]", metaMuted)}>
          <span className="font-semibold tracking-tight">
            {message.isInternal
              ? "یادداشت داخلی"
              : senderLabel(message.senderType, selfSenderType)}
          </span>
          {message.editedAt ? <span>ویرایش‌شده</span> : null}
        </div>

        {replyPreview ? (
          <div
            className={cn(
              "mb-2 rounded-xl border-s-2 px-2.5 py-1.5 text-[11px]",
              isSelf
                ? variant === "storefront"
                  ? "border-primary/30 bg-black/5"
                  : "border-white/30 bg-white/10"
                : "border-gold/50 bg-gold-dim/50",
            )}
          >
            <p className="truncate font-medium">
              {senderLabel(replyPreview.senderType, selfSenderType)}
            </p>
            <p className="truncate opacity-80">
              {replyPreview.body || "پیوست"}
            </p>
          </div>
        ) : null}

        {message.body ? (
          <div
            className="whitespace-pre-wrap break-words leading-[1.65] [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{
              __html: renderLightMarkdown(message.body),
            }}
          />
        ) : null}

        {message.attachmentUrl ? (
          <div className="mt-2">
            {isImage ? (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl ring-1 ring-black/5"
              >
                <Image
                  src={message.attachmentUrl}
                  alt={message.attachmentName ?? "پیوست"}
                  width={320}
                  height={240}
                  className="h-auto max-h-56 w-full object-cover"
                  unoptimized
                />
              </a>
            ) : (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium underline-offset-2 hover:underline",
                  isSelf
                    ? variant === "storefront"
                      ? "bg-black/5"
                      : "bg-white/10"
                    : "bg-surface-muted",
                )}
              >
                <Icon icon={isPdf ? FilePdf : Paperclip} size={14} />
                {isPdf
                  ? "مشاهده PDF"
                  : (message.attachmentName ?? "مشاهده پیوست")}
              </a>
            )}
          </div>
        ) : null}

        <div
          className={cn(
            "mt-1.5 flex items-center justify-between gap-2",
            metaMuted,
          )}
        >
          <div className="flex items-center gap-1.5 text-[10.5px] tabular-nums">
            <time dateTime={message.createdAt}>
              {formatMessageTime(message.createdAt)}
            </time>
            {message.pending ? (
              <span className="inline-flex items-center gap-1">
                <Icon icon={SpinnerGap} size={11} className="animate-spin" />
                در حال ارسال
              </span>
            ) : null}
            {message.failed ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-rose-600 underline"
                onClick={() => onRetry?.(message)}
              >
                <Icon icon={WarningCircle} size={12} />
                تلاش مجدد
              </button>
            ) : null}
            {isSelf && !message.pending && !message.failed ? (
              <span
                className="inline-flex items-center"
                title={message.delivery ?? "sent"}
              >
                {message.delivery === "read" ? (
                  <Icon
                    icon={Checks}
                    size={14}
                    className={
                      variant === "storefront" ? "text-primary/80" : "text-sky-300"
                    }
                  />
                ) : message.delivery === "delivered" ? (
                  <Icon icon={Checks} size={14} />
                ) : (
                  <Icon icon={Check} size={14} />
                )}
              </span>
            ) : null}
          </div>

          {onReply && !message.pending ? (
            <button
              type="button"
              className={cn(
                "inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 text-[11px] opacity-70 transition hover:opacity-100",
                "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                isSelf
                  ? variant === "storefront"
                    ? "hover:bg-black/5"
                    : "hover:bg-white/10"
                  : "hover:bg-black/5",
              )}
              onClick={() => onReply(message)}
            >
              <Icon icon={ArrowBendUpLeft} size={13} />
              پاسخ
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

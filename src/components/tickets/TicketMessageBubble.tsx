"use client";

import Image from "next/image";
import {
  ArrowBendUpLeft,
  Checks,
  Check,
  WarningCircle,
  SpinnerGap,
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
        <p className="max-w-md rounded-full bg-stone-200/70 px-3 py-1 text-center text-[11px] text-stone-600">
          {message.body}
        </p>
      </div>
    );
  }

  if (message.deletedAt) {
    return (
      <div className={cn("flex w-full", isSelf ? "justify-start" : "justify-end")}>
        <p className="rounded-2xl border border-dashed border-stone-300 px-3 py-2 text-xs italic text-stone-400">
          پیام حذف شد
        </p>
      </div>
    );
  }

  return (
    <div className={cn("group flex w-full", isSelf ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[min(100%,28rem)] px-3.5 py-2.5 text-sm shadow-sm rounded-2xl",
          bubbleTone(isSelf, variant, message.isInternal, false),
          message.pending && "opacity-70",
          message.failed && "ring-1 ring-rose-400",
        )}
      >
        <div
          className={cn(
            "mb-1 flex flex-wrap items-center gap-2 text-[11px]",
            isSelf
              ? variant === "storefront"
                ? "text-primary/70"
                : message.isInternal
                  ? "text-amber-800/70"
                  : "text-white/70"
              : "text-zinc-500",
          )}
        >
          <span className="font-medium">
            {message.isInternal
              ? "یادداشت داخلی"
              : senderLabel(message.senderType, selfSenderType)}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
          {message.editedAt ? <span>(ویرایش‌شده)</span> : null}
          {message.pending ? (
            <span className="inline-flex items-center gap-1">
              <Icon icon={SpinnerGap} size={12} className="animate-spin" />
              در حال ارسال
            </span>
          ) : null}
          {message.failed ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-rose-300 underline"
              onClick={() => onRetry?.(message)}
            >
              <Icon icon={WarningCircle} size={12} />
              تلاش مجدد
            </button>
          ) : null}
          {isSelf && !message.pending && !message.failed ? (
            <span className="inline-flex items-center" title={message.delivery ?? "sent"}>
              {message.delivery === "read" ? (
                <Icon icon={Checks} size={14} className="text-sky-300" />
              ) : message.delivery === "delivered" ? (
                <Icon icon={Checks} size={14} />
              ) : (
                <Icon icon={Check} size={14} />
              )}
            </span>
          ) : null}
        </div>

        {replyPreview ? (
          <div className="mb-2 rounded-lg border border-black/10 bg-black/5 px-2 py-1 text-[11px] opacity-80">
            <p className="truncate font-medium">
              {senderLabel(replyPreview.senderType, selfSenderType)}
            </p>
            <p className="truncate">{replyPreview.body || "پیوست"}</p>
          </div>
        ) : null}

        {message.body ? (
          <div
            className="whitespace-pre-wrap break-words leading-relaxed [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: renderLightMarkdown(message.body) }}
          />
        ) : null}

        {message.attachmentUrl ? (
          <div className="mt-2">
            {isImage ? (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg"
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
                className="text-xs underline underline-offset-2"
              >
                {isPdf ? "مشاهده PDF" : message.attachmentName ?? "مشاهده پیوست"}
              </a>
            )}
          </div>
        ) : null}

        {onReply && !message.pending ? (
          <button
            type="button"
            className={cn(
              "mt-1.5 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] opacity-80 transition hover:opacity-100",
              "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
              isSelf
                ? variant === "storefront"
                  ? "text-primary/80 hover:bg-black/5"
                  : "text-white/80 hover:bg-white/10"
                : "text-zinc-600 hover:bg-black/5",
            )}
            onClick={() => onReply(message)}
          >
            <Icon icon={ArrowBendUpLeft} size={14} />
            پاسخ
          </button>
        ) : null}
      </div>
    </div>
  );
}

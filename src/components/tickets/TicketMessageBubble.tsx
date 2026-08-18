"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowBendUpLeft,
  Checks,
  Check,
  WarningCircle,
  SpinnerGap,
  FilePdf,
  Paperclip,
  Headset,
  User,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  bubbleTone,
  deliveryStatusLabel,
  formatMessageTime,
  messageStackClass,
  renderLightMarkdown,
  senderLabel,
  type ChatMessage,
  type MessageGroupFlags,
  type TicketChatVariant,
} from "./chat-utils";
import { sanitizeTicketAttachmentUrl } from "@/lib/tickets/attachment-url";

const SWIPE_THRESHOLD = 48;

function clockLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return formatMessageTime(iso);
  }
}

function DeliveryTicks({
  delivery,
  variant,
}: {
  delivery?: string | null;
  variant: TicketChatVariant;
}) {
  const size = 15;
  if (delivery === "read") {
    return (
      <Icon
        icon={Checks}
        size={size}
        weight="bold"
        className={
          variant === "storefront" ? "text-sky-100" : "text-sky-300"
        }
      />
    );
  }
  if (delivery === "delivered") {
    return (
      <Icon
        icon={Check}
        size={size}
        weight="bold"
        className={
          variant === "storefront" ? "text-ink-on-gold/45" : "text-white/45"
        }
      />
    );
  }
  return (
    <Icon
      icon={Check}
      size={size}
      weight="bold"
      className={
        variant === "storefront" ? "text-ink-on-gold/45" : "text-white/45"
      }
    />
  );
}

type Props = {
  message: ChatMessage;
  selfSenderType: string;
  variant: TicketChatVariant;
  replyPreview?: ChatMessage | null;
  group?: MessageGroupFlags;
  onReply?: (message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
  /** Display name for the other party (admin sees customer name). */
  counterpartName?: string | null;
  /** Intercom-style compact bubbles for FAB / mobile. */
  compact?: boolean;
};

export function TicketMessageBubble({
  message,
  selfSenderType,
  variant,
  replyPreview,
  group,
  onReply,
  onRetry,
  counterpartName = null,
  compact = false,
}: Props) {
  const isSystem = message.senderType === "system";
  const isSelf = message.senderType === selfSenderType;
  const attachmentUrl = sanitizeTicketAttachmentUrl(message.attachmentUrl);
  const isImage =
    !!attachmentUrl &&
    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(attachmentUrl);
  const isPdf =
    !!attachmentUrl &&
    (message.attachmentMime === "application/pdf" ||
      /\.pdf(\?|$)/i.test(attachmentUrl));

  const flags: MessageGroupFlags = group ?? {
    isFirstInGroup: true,
    isLastInGroup: true,
    showSender: true,
    showMeta: true,
    stackGap: "turn",
  };

  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragXRef = useRef(0);
  const dragging = useRef(false);
  const messenger = compact && variant === "storefront";

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!onReply || message.pending || e.pointerType === "mouse") return;
    dragging.current = true;
    startX.current = e.clientX;
    dragXRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientX - startX.current;
    const signed = isSelf ? Math.min(0, delta) : Math.max(0, delta);
    const next = Math.max(-72, Math.min(72, signed));
    dragXRef.current = next;
    setDragX(next);
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (Math.abs(dragXRef.current) >= SWIPE_THRESHOLD && onReply) {
      onReply(message);
    }
    dragXRef.current = 0;
    setDragX(0);
  };

  if (isSystem && !messenger) {
    return (
      <div className="ticket-msg-enter flex justify-center px-2 py-1">
        <p
          className={cn(
            "max-w-[90%] rounded-full px-3.5 py-1 text-center text-[11px] leading-relaxed",
            variant === "storefront"
              ? "bg-surface/80 text-secondary shadow-[0_8px_20px_-16px_rgb(28_25_23/0.25)]"
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
      <div
        className={cn(
          "ticket-msg-enter flex w-full",
          isSelf ? "justify-start" : "justify-end",
        )}
      >
        <p className="rounded-2xl bg-surface/40 px-3 py-2 text-xs italic text-stone-400">
          پیام حذف شد
        </p>
      </div>
    );
  }

  const asAgent = isSystem || !isSelf;
  const metaMuted = isSelf
    ? variant === "storefront"
      ? "text-ink-on-gold/70"
      : message.isInternal
        ? "text-amber-800/70"
        : "text-white/65"
    : "text-secondary";

  const showAvatar = messenger
    ? asAgent && flags.isLastInGroup
    : !isSelf && flags.isLastInGroup;
  const deliveryTitle = deliveryStatusLabel(message.delivery);
  const showSenderLabel =
    !messenger &&
    flags.showSender &&
    !(isSelf && variant === "storefront");

  return (
    <div
      className={cn(
        "ticket-msg-enter group relative flex w-full items-end gap-2",
        isSelf ? "justify-start" : "justify-end",
        messageStackClass(flags.stackGap, { compact: messenger }),
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {showAvatar ? (
        <div
          className={cn(
            // In RTL + justify-end, last flex item sits on the outer edge.
            asAgent && "order-2",
            "flex shrink-0 items-center justify-center rounded-full",
            messenger ? "h-7 w-7" : "h-8 w-8",
            variant === "storefront"
              ? "bg-gold-dim text-gold"
              : "bg-stone-200 text-stone-600",
          )}
          aria-hidden
        >
          <Icon
            icon={isSystem || message.senderType === "admin" ? Headset : User}
            size={messenger ? 13 : 14}
            weight="duotone"
          />
        </div>
      ) : asAgent ? (
        <div
          className={cn("order-2 shrink-0", messenger ? "w-7" : "w-8")}
          aria-hidden
        />
      ) : null}

      {Math.abs(dragX) > 8 ? (
        <span
          className={cn(
            "pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 text-secondary opacity-70",
            isSelf ? "right-2" : "left-2",
          )}
          aria-hidden
        >
          <Icon icon={ArrowBendUpLeft} size={18} />
        </span>
      ) : null}

      <div
        className={cn(
          "relative text-[15px] leading-snug sm:text-[15px]",
          asAgent && "order-1",
          messenger
            ? "max-w-[min(82%,22rem)] px-3.5 py-2 sm:max-w-[min(70%,28rem)]"
            : "max-w-[min(85%,22rem)] px-3.5 py-2.5 sm:max-w-[min(100%,28rem)] sm:text-sm",
          "rounded-2xl transition-transform duration-150 ease-out will-change-transform",
          flags.isFirstInGroup && flags.isLastInGroup
            ? messenger
              ? isSelf
                ? "rounded-2xl rounded-es-md"
                : "rounded-2xl rounded-ee-md"
              : "rounded-2xl"
            : isSelf
              ? cn(
                  flags.isFirstInGroup && "rounded-ee-md",
                  flags.isLastInGroup && "rounded-es-2xl rounded-ee-md",
                  !flags.isFirstInGroup &&
                    !flags.isLastInGroup &&
                    "rounded-e-md",
                )
              : cn(
                  flags.isFirstInGroup && "rounded-es-md",
                  flags.isLastInGroup && "rounded-ee-2xl rounded-es-md",
                  !flags.isFirstInGroup &&
                    !flags.isLastInGroup &&
                    "rounded-s-md",
                ),
          isSystem && messenger
            ? "border border-border/70 bg-surface text-primary shadow-[0_8px_20px_-16px_rgb(28_25_23/0.2)]"
            : bubbleTone(isSelf, variant, message.isInternal, false),
          message.pending && "opacity-75",
          message.failed && "ring-2 ring-rose-400/70",
          messenger && flags.showMeta && !message.body && "pb-5",
        )}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        {showSenderLabel ? (
          <div
            className={cn(
              "mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px]",
              metaMuted,
            )}
          >
            <span className="font-medium tracking-tight">
              {message.isInternal
                ? "یادداشت داخلی"
                : senderLabel(message.senderType, selfSenderType, {
                    counterpartName,
                  })}
            </span>
            {message.editedAt ? (
              <span className="font-light">ویرایش‌شده</span>
            ) : null}
          </div>
        ) : null}

        {replyPreview ? (
          <div
            className={cn(
              "mb-1.5 rounded-xl border-s-2 px-2 py-1 text-[11px]",
              isSelf
                ? variant === "storefront"
                  ? "border-primary/30 bg-black/5"
                  : "border-white/30 bg-white/10"
                : "border-gold/50 bg-gold-dim/50",
            )}
          >
            <p className="truncate font-medium">
              {senderLabel(replyPreview.senderType, selfSenderType, {
                counterpartName,
              })}
            </p>
            <p className="truncate opacity-80">
              {replyPreview.body || "پیوست"}
            </p>
          </div>
        ) : null}

        {message.body ? (
          <div
            className={cn(
              "whitespace-pre-wrap break-words [&_pre]:whitespace-pre",
              messenger ? "leading-[1.5]" : "leading-[1.65]",
            )}
          >
            <span
              dangerouslySetInnerHTML={{
                __html: renderLightMarkdown(message.body),
              }}
            />
            {messenger && flags.showMeta ? (
              <span className="inline-block w-[4.35rem]" aria-hidden />
            ) : null}
          </div>
        ) : null}

        {attachmentUrl ? (
          <div className="mt-1.5">
            {isImage ? (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl shadow-[0_8px_20px_-14px_rgb(0_0_0/0.25)]"
              >
                <Image
                  src={attachmentUrl}
                  alt={message.attachmentName ?? "پیوست"}
                  width={320}
                  height={240}
                  className="h-auto max-h-48 w-full object-cover"
                  unoptimized
                />
              </a>
            ) : (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium underline-offset-2 hover:underline",
                  isSelf
                    ? variant === "storefront"
                      ? "bg-black/5"
                      : "bg-white/10"
                    : "bg-surface/60",
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

        {flags.showMeta ? (
          messenger ? (
            <div
              className={cn(
                "absolute bottom-1.5 end-2.5 flex items-center gap-0.5 text-[10px] tabular-nums leading-none",
                metaMuted,
              )}
            >
              <time dateTime={message.createdAt}>
                {clockLabel(message.createdAt)}
              </time>
              {message.pending ? (
                <Icon icon={SpinnerGap} size={12} className="animate-spin" />
              ) : null}
              {message.failed ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 text-rose-600"
                  onClick={() => onRetry?.(message)}
                  aria-label="تلاش مجدد"
                >
                  <Icon icon={WarningCircle} size={12} />
                </button>
              ) : null}
              {isSelf && !message.pending && !message.failed ? (
                <span title={deliveryTitle} aria-label={deliveryTitle}>
                  <DeliveryTicks
                    delivery={message.delivery}
                    variant={variant}
                  />
                </span>
              ) : null}
            </div>
          ) : (
            <div
              className={cn(
                "mt-1.5 flex items-center justify-between gap-2",
                metaMuted,
              )}
            >
              <div className="flex items-center gap-1.5 text-[10.5px] font-light tabular-nums">
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
                    className="inline-flex min-h-8 items-center gap-1 text-rose-600 underline"
                    onClick={() => onRetry?.(message)}
                  >
                    <Icon icon={WarningCircle} size={12} />
                    تلاش مجدد
                  </button>
                ) : null}
                {isSelf && !message.pending && !message.failed ? (
                  <span
                    className="inline-flex items-center gap-0.5"
                    title={deliveryTitle}
                    aria-label={deliveryTitle}
                  >
                    <DeliveryTicks
                      delivery={message.delivery}
                      variant={variant}
                    />
                  </span>
                ) : null}
              </div>

              {onReply && !message.pending ? (
                <button
                  type="button"
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-1.5 text-[11px] opacity-70 transition hover:opacity-100 sm:min-h-8 sm:min-w-0",
                    "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100",
                    isSelf
                      ? variant === "storefront"
                        ? "hover:bg-black/5"
                        : "hover:bg-white/10"
                      : "hover:bg-black/5",
                  )}
                  onClick={() => onReply(message)}
                  aria-label="پاسخ"
                >
                  <Icon icon={ArrowBendUpLeft} size={13} />
                  <span className="hidden sm:inline">پاسخ</span>
                </button>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

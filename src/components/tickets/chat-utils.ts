"use client";

import { cn } from "@/lib/utils";
import type { TicketMessage } from "@/lib/tickets/types";

export type ChatMessage = TicketMessage & {
  pending?: boolean;
  failed?: boolean;
  clientKey?: string;
};

export type TicketChatVariant = "admin" | "storefront";

export type TicketChatLayout = "embedded" | "fullscreen" | "widget";

/** Human-readable ticket status for customers and operators. */
export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "باز",
  waiting: "در انتظار پشتیبانی",
  pending: "منتظر پاسخ شما",
  answered: "پاسخ داده شد",
  resolved: "حل‌شده",
  closed: "بسته",
};

export const TICKET_STATUS_HINTS: Record<string, string> = {
  open: "پیام‌تان را می‌خوانیم",
  waiting: "پاسخ همین‌جا می‌آید",
  pending: "پشتیبان پاسخ داده؛ منتظر شماست",
  answered: "پشتیبان پاسخ داده",
  resolved: "مشکل حل شده",
  closed: "این گفتگو بسته است",
};

export const TICKET_PRIORITY_LABELS: Record<string, string> = {
  low: "کم",
  normal: "عادی",
  high: "بالا",
};

export function ticketStatusLabel(status: string): string {
  return TICKET_STATUS_LABELS[status] ?? status;
}

export function ticketStatusHint(status: string): string {
  return TICKET_STATUS_HINTS[status] ?? "";
}

export function ticketPriorityLabel(priority: string): string {
  return TICKET_PRIORITY_LABELS[priority] ?? priority;
}

export function senderLabel(
  senderType: string,
  selfType: string,
  opts?: { counterpartName?: string | null },
): string {
  if (senderType === "system") return "سیستم";
  if (senderType === selfType) return "شما";
  if (senderType === "admin") return "پشتیبانی";
  if (senderType === "customer") {
    const name = opts?.counterpartName?.trim();
    return name || "مشتری";
  }
  if (senderType === "seller") return "فروشنده";
  return senderType;
}

export function formatMessageTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "همین الان";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} دقیقه پیش`;
    return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function formatRelativeShort(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "الان";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000).toLocaleString("fa-IR")}د`;
    if (diff < 86_400_000) {
      return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 86_400_000 * 7) {
      return d.toLocaleDateString("fa-IR", { weekday: "short" });
    }
    return d.toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function formatDayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    if (sameDay(d, today)) return "امروز";
    if (sameDay(d, yesterday)) return "دیروز";
    return d.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function dayKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return iso;
  }
}

export function bubbleTone(
  isSelf: boolean,
  variant: TicketChatVariant,
  isInternal?: boolean,
  isSystem?: boolean,
): string {
  if (isSystem) {
    return "bg-transparent text-stone-500 shadow-none ring-0 border-0";
  }
  if (isInternal) {
    return "bg-amber-100/90 text-amber-950 shadow-[0_10px_28px_-18px_rgb(180_83_9/0.35)]";
  }
  if (isSelf) {
    return variant === "storefront"
      ? "bg-gold text-ink-on-gold [&_*]:text-inherit shadow-[0_12px_28px_-16px_var(--gold-glow)]"
      : "bg-zinc-900 text-white [&_*]:text-inherit shadow-[0_12px_28px_-16px_rgb(24_24_27/0.45)]";
  }
  return variant === "storefront"
    ? "border border-border/60 bg-surface text-primary shadow-[0_10px_28px_-18px_rgb(28_25_23/0.14)]"
    : "bg-stone-100 text-zinc-800 shadow-[0_10px_28px_-18px_rgb(28_25_23/0.16)]";
}

export function isStoreMessengerLayout(
  variant: TicketChatVariant,
  layout: TicketChatLayout,
): boolean {
  return variant === "storefront" && (layout === "widget" || layout === "fullscreen");
}

export function storefrontThreadTitle(): string {
  return "پشتیبانی حاجی‌عسل";
}

export function storefrontThreadKicker(subject: string): string | null {
  const trimmed = subject.trim();
  if (!trimmed) return null;
  if (trimmed === "گفتگو با پشتیبانی" || trimmed === "پشتیبانی حاجی‌عسل") {
    return null;
  }
  return trimmed;
}

export function shellClass(
  variant: TicketChatVariant,
  layout: TicketChatLayout = "embedded",
): string {
  return cn(
    "relative flex min-h-0 flex-col overflow-hidden",
    layout === "fullscreen"
      ? "h-full rounded-none border-0 shadow-none"
      : layout === "widget"
        ? "h-full min-h-0"
        : "h-full min-h-[28rem] sm:min-h-[32rem] sm:h-[min(70vh,40rem)]",
    variant === "storefront"
      ? layout === "fullscreen" || layout === "widget"
        ? "ticket-chat-canvas"
        : "ticket-chat-canvas rounded-2xl shadow-[0_18px_40px_-28px_rgb(28_25_23/0.28)]"
      : layout === "fullscreen"
        ? "bg-[#f5f5f4]"
        : "rounded-2xl bg-gradient-to-b from-white to-stone-50 shadow-[0_18px_40px_-28px_rgb(28_25_23/0.22)]",
  );
}

/** Messages within this window from the same sender form one visual group. */
export const MESSAGE_GROUP_GAP_MS = 2 * 60 * 1000;

export type MessageStackGap = "cluster" | "group" | "turn";

export type MessageGroupFlags = {
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showSender: boolean;
  showMeta: boolean;
  /** Vertical gap above this bubble, WhatsApp-style. */
  stackGap: MessageStackGap;
};

export function messageStackClass(
  gap: MessageStackGap,
  opts: { compact?: boolean; isFirst?: boolean } = {},
): string {
  if (opts.isFirst) return "";
  if (gap === "cluster") return opts.compact ? "mt-2" : "mt-1.5";
  if (gap === "group") return "mt-3";
  return opts.compact ? "mt-4" : "mt-3.5";
}

function sameMessageGroup(a: ChatMessage, b: ChatMessage): boolean {
  if (a.senderType === "system" || b.senderType === "system") return false;
  if (a.deletedAt || b.deletedAt) return false;
  if (a.senderType !== b.senderType) return false;
  if (Boolean(a.isInternal) !== Boolean(b.isInternal)) return false;
  const dt = Math.abs(
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return dt < MESSAGE_GROUP_GAP_MS;
}

export function computeMessageGroupFlags(
  messages: ChatMessage[],
  index: number,
): MessageGroupFlags {
  const message = messages[index];
  if (!message || message.senderType === "system" || message.deletedAt) {
    return {
      isFirstInGroup: true,
      isLastInGroup: true,
      showSender: false,
      showMeta: true,
      stackGap: "turn",
    };
  }
  const prev = index > 0 ? messages[index - 1] : undefined;
  const next = index < messages.length - 1 ? messages[index + 1] : undefined;
  const isFirstInGroup = !prev || !sameMessageGroup(prev, message);
  const isLastInGroup = !next || !sameMessageGroup(message, next);
  const stackGap: MessageStackGap =
    !prev ||
    prev.senderType === "system" ||
    prev.senderType !== message.senderType ||
    Boolean(prev.deletedAt)
      ? "turn"
      : isFirstInGroup
        ? "group"
        : "cluster";
  return {
    isFirstInGroup,
    isLastInGroup,
    showSender: isFirstInGroup,
    showMeta: isLastInGroup,
    stackGap,
  };
}

export function deliveryStatusLabel(delivery?: string | null): string {
  switch (delivery) {
    case "sending":
      return "در حال ارسال";
    case "delivered":
      return "تحویل داده شد";
    case "read":
      return "خوانده شد";
    case "failed":
      return "ناموفق";
    case "sent":
    default:
      return "ارسال شد";
  }
}

/** Minimal safe markdown: **bold**, `code`, ```blocks``` */
export function renderLightMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(
      /```([\s\S]*?)```/g,
      '<pre class="mt-1 overflow-x-auto rounded-xl bg-black/10 p-2 text-xs"><code>$1</code></pre>',
    )
    .replace(
      /`([^`]+)`/g,
      '<code class="rounded-md bg-black/10 px-1 text-[0.85em]">$1</code>',
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function draftStorageKey(ticketId: string, role: string) {
  return `hajiasal.ticket.draft.${role}.${ticketId}`;
}

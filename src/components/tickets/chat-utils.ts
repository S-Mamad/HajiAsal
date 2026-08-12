"use client";

import { cn } from "@/lib/utils";
import type { TicketMessage } from "@/lib/tickets/types";

export type ChatMessage = TicketMessage & {
  pending?: boolean;
  failed?: boolean;
  clientKey?: string;
};

export type TicketChatVariant = "admin" | "storefront";

export type TicketChatLayout = "embedded" | "fullscreen";

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
  open: "تیکت ثبت شد",
  waiting: "پشتیبان به‌زودی پاسخ می‌دهد",
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

export function senderLabel(senderType: string, selfType: string): string {
  if (senderType === "system") return "سیستم";
  if (senderType === selfType) return "شما";
  if (senderType === "admin") return "پشتیبانی";
  if (senderType === "customer") return "مشتری";
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
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}ق`;
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
    return "bg-amber-50/95 text-amber-950 border border-amber-200/80 shadow-sm";
  }
  if (isSelf) {
    return variant === "storefront"
      ? "bg-gold text-primary shadow-[0_8px_20px_-12px_var(--gold-glow)]"
      : "bg-zinc-900 text-white shadow-md shadow-zinc-900/20";
  }
  return variant === "storefront"
    ? "bg-surface text-primary border border-border/80 shadow-[0_6px_18px_-14px_rgb(28_25_23/0.35)]"
    : "bg-white text-zinc-800 border border-stone-200 shadow-sm";
}

export function shellClass(
  variant: TicketChatVariant,
  layout: TicketChatLayout = "embedded",
): string {
  return cn(
    "relative flex min-h-0 flex-col overflow-hidden",
    layout === "fullscreen"
      ? "h-full rounded-none border-0 shadow-none"
      : "h-full min-h-[28rem] sm:min-h-[32rem] sm:h-[min(70vh,40rem)]",
    variant === "storefront"
      ? layout === "fullscreen"
        ? "ticket-chat-canvas"
        : "ticket-chat-canvas rounded-2xl border border-border shadow-sm"
      : layout === "fullscreen"
        ? "bg-stone-50"
        : "rounded-xl border border-stone-200 bg-gradient-to-b from-white to-stone-50 shadow-sm",
  );
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

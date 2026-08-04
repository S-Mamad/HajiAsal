"use client";

import { cn } from "@/lib/utils";
import type { TicketMessage } from "@/lib/tickets/types";

export type ChatMessage = TicketMessage & {
  pending?: boolean;
  failed?: boolean;
  clientKey?: string;
};

export type TicketChatVariant = "admin" | "storefront";

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
    if (diff < 86_400_000) {
      return d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    return "bg-amber-50 text-amber-950 border border-amber-200 rounded-br-md";
  }
  if (isSelf) {
    return variant === "storefront"
      ? "bg-gold text-primary rounded-bl-md"
      : "bg-zinc-900 text-white rounded-bl-md";
  }
  return variant === "storefront"
    ? "bg-surface-elevated text-primary border border-border rounded-br-md"
    : "bg-white text-zinc-800 border border-stone-200 rounded-br-md";
}

export function shellClass(variant: TicketChatVariant): string {
  return cn(
    "flex h-full min-h-0 flex-col overflow-hidden",
    variant === "storefront"
      ? "rounded-2xl border border-border bg-gradient-to-b from-surface to-surface-muted/40 shadow-sm"
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
    .replace(/```([\s\S]*?)```/g, "<pre class=\"mt-1 overflow-x-auto rounded-lg bg-black/10 p-2 text-xs\"><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code class=\"rounded bg-black/10 px-1 text-[0.85em]\">$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function draftStorageKey(ticketId: string, role: string) {
  return `hajiasal.ticket.draft.${role}.${ticketId}`;
}

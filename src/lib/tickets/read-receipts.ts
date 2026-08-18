import type { TicketMessage, TicketMessageDelivery } from "@/lib/tickets/types";

/** Ticket statuses that imply the customer likely has staff reply waiting. */
export const STAFF_UNREAD_HINT_STATUSES = new Set(["pending", "answered"]);

type ReceiptMessage = Pick<
  TicketMessage,
  "senderType" | "createdAt" | "isInternal" | "deletedAt" | "delivery"
>;

type ReceiptTicket = {
  status: string;
  lastReadByCustomerAt?: string | null;
  lastReadByAdminAt?: string | null;
};

/** Parse ISO or MySQL DATETIME into epoch ms. 1s slack covers DATETIME rounding. */
export function receiptTimestamp(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const normalized = trimmed.includes("T")
    ? trimmed
    : trimmed.replace(" ", "T") + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed) ? "" : "Z");
  const parsed = Date.parse(normalized);
  if (Number.isFinite(parsed)) return parsed;
  const fallback = Date.parse(trimmed);
  return Number.isFinite(fallback) ? fallback : Number.NaN;
}

function isCoveredByWatermark(
  createdAt: string,
  watermark: string | null,
): boolean {
  if (!watermark) return false;
  const created = receiptTimestamp(createdAt);
  const readAt = receiptTimestamp(watermark);
  if (!Number.isFinite(created) || !Number.isFinite(readAt)) {
    return createdAt <= watermark;
  }
  return created <= readAt + 1000;
}

/**
 * Derive WhatsApp-style ticks from ticket-level read watermarks.
 * Sent messages stay on a single tick until the other party opens the thread.
 * Customer messages → two ticks when the admin watermark covers them.
 * Admin messages → two ticks when the customer watermark covers them.
 */
export function applyDeliveryReceipts<T extends ReceiptMessage>(
  messages: T[],
  ticket: ReceiptTicket,
): Array<T & { delivery: TicketMessageDelivery }> {
  const adminReadAt = ticket.lastReadByAdminAt ?? null;
  const customerReadAt = ticket.lastReadByCustomerAt ?? null;

  return messages.map((message) => {
    if (message.delivery === "sending" || message.delivery === "failed") {
      return { ...message, delivery: message.delivery };
    }

    if (message.senderType === "customer") {
      const delivery: TicketMessageDelivery = isCoveredByWatermark(
        message.createdAt,
        adminReadAt,
      )
        ? "read"
        : "sent";
      return { ...message, delivery };
    }

    if (message.senderType === "admin") {
      const delivery: TicketMessageDelivery = isCoveredByWatermark(
        message.createdAt,
        customerReadAt,
      )
        ? "read"
        : "sent";
      return { ...message, delivery };
    }

    return {
      ...message,
      delivery: (message.delivery ?? "delivered") as TicketMessageDelivery,
    };
  });
}

/** Count admin messages the customer has not yet seen. */
export function countUnreadStaffMessages(input: {
  status: string;
  lastReadByCustomerAt?: string | null;
  messages: ReceiptMessage[];
}): number {
  const hasCursor = Boolean(input.lastReadByCustomerAt);
  if (!hasCursor && !STAFF_UNREAD_HINT_STATUSES.has(input.status)) {
    return 0;
  }

  const since = input.lastReadByCustomerAt ?? "1970-01-01T00:00:00.000Z";
  let count = 0;
  for (const message of input.messages) {
    if (message.isInternal || message.deletedAt) continue;
    if (message.senderType !== "admin") continue;
    if (!isCoveredByWatermark(message.createdAt, since)) count += 1;
  }
  return count;
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return "";
  if (count > 9) return "۹+";
  return count.toLocaleString("fa-IR");
}

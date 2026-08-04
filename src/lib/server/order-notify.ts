import type { OrderStatus, StoredOrder } from "./orders";
import {
  isOrderSmsEnabled,
  isTransactionalSmsConfigured,
  sendTransactionalSms,
} from "./sms";

export type OrderNotifyEvent =
  | "confirmed"
  | "shipped"
  | "cancelled"
  | "refunded";

/** @deprecated Prefer isTransactionalSmsConfigured from sms.ts */
export function isOrderSmsConfigured(): boolean {
  return isTransactionalSmsConfigured();
}

export { sendTransactionalSms };

function buildMessage(
  event: OrderNotifyEvent,
  order: StoredOrder,
): string {
  const id = order.id;
  switch (event) {
    case "confirmed":
      return `حاجی‌عسل: سفارش ${id} تأیید شد و در حال آماده‌سازی است.`;
    case "shipped":
      return order.trackingCode
        ? `حاجی‌عسل: سفارش ${id} ارسال شد. کد رهگیری: ${order.trackingCode}`
        : `حاجی‌عسل: سفارش ${id} ارسال شد.`;
    case "cancelled":
      return `حاجی‌عسل: سفارش ${id} لغو شد.`;
    case "refunded":
      return `حاجی‌عسل: مبلغ سفارش ${id} استرداد شد.`;
    default:
      return `حاجی‌عسل: به‌روزرسانی سفارش ${id}`;
  }
}

export function resolveOrderNotifyEvent(input: {
  prevStatus?: OrderStatus;
  nextStatus?: OrderStatus;
  refunded?: boolean;
  trackingCode?: string | null;
}): OrderNotifyEvent | null {
  if (input.refunded) return "refunded";
  if (!input.nextStatus) return null;
  if (input.nextStatus === input.prevStatus) {
    if (
      input.nextStatus === "shipped" &&
      input.trackingCode &&
      input.trackingCode.trim()
    ) {
      return "shipped";
    }
    return null;
  }
  if (input.nextStatus === "confirmed") return "confirmed";
  if (input.nextStatus === "shipped") return "shipped";
  if (input.nextStatus === "cancelled") return "cancelled";
  return null;
}

/**
 * Soft-fail notify: never throws; logs on failure.
 * Disabled by default — set ORDER_SMS_ENABLED=true to turn on.
 */
export async function notifyOrderStatusChange(
  order: StoredOrder,
  event: OrderNotifyEvent,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!isOrderSmsEnabled()) {
    return { sent: false, skipped: "disabled" };
  }
  if (!isTransactionalSmsConfigured()) {
    return { sent: false, skipped: "not_configured" };
  }
  const phone = order.customer?.phone;
  if (!phone) {
    return { sent: false, skipped: "no_phone" };
  }
  const message = buildMessage(event, order);
  const result = await sendTransactionalSms(phone, message);
  if (!result.ok) {
    console.error("[order-notify]", order.id, event, result.error);
    return { sent: false, error: result.error };
  }
  return { sent: true };
}

/** @internal */
export const __orderNotifyTestUtils = {
  buildMessage,
  resolveOrderNotifyEvent,
};

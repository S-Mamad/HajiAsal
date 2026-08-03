import { normalizePhone } from "@/lib/auth/phone";
import type { OrderStatus, StoredOrder } from "./orders";

export type OrderNotifyEvent =
  | "confirmed"
  | "shipped"
  | "cancelled"
  | "refunded";

function getSmsProvider(): "melipayamak" | "kavenegar" | "ghasedak" {
  const p = process.env.SMS_PROVIDER?.toLowerCase().trim();
  if (p === "melipayamak" || p === "meli" || p === "meli-payamak") {
    return "melipayamak";
  }
  if (p === "ghasedak") return "ghasedak";
  return "kavenegar";
}

function melipayamakSimpleUrl(): string | null {
  const full = process.env.MELIPAYAMAK_SMS_URL?.trim();
  if (full) return full.replace(/\/$/, "");
  const token =
    process.env.MELIPAYAMAK_SMS_TOKEN?.trim() ||
    process.env.MELIPAYAMAK_OTP_TOKEN?.trim() ||
    process.env.SMS_API_KEY?.trim();
  if (!token) return null;
  return `https://console.melipayamak.com/api/send/simple/${token}`;
}

/** True when a free-text (non-OTP-only) SMS channel is configured. */
export function isOrderSmsConfigured(): boolean {
  const provider = getSmsProvider();
  if (provider === "melipayamak") {
    return Boolean(melipayamakSimpleUrl());
  }
  return Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER);
}

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

async function sendViaMelipayamak(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const url = melipayamakSimpleUrl();
  if (!url) {
    return { ok: false, error: "Melipayamak SMS URL not configured" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: phone.replace(/\D/g, ""),
        text: message,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { ok: false, error: `melipayamak HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "melipayamak failed",
    };
  }
}

async function sendViaKavenegar(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER;
  if (!apiKey || !sender) {
    return { ok: false, error: "SMS_API_KEY/SMS_SENDER missing" };
  }
  try {
    const res = await fetch(
      `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          receptor: phone.replace(/\D/g, ""),
          sender,
          message,
        }).toString(),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      return?: { status?: number };
    };
    if (!res.ok || data.return?.status !== 200) {
      return { ok: false, error: "kavenegar send failed" };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "kavenegar failed",
    };
  }
}

async function sendViaGhasedak(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER;
  if (!apiKey || !sender) {
    return { ok: false, error: "SMS_API_KEY/SMS_SENDER missing" };
  }
  try {
    const res = await fetch("https://api.ghasedak.me/v2/sms/send/simple", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: apiKey,
      },
      body: new URLSearchParams({
        message,
        receptor: phone.replace(/\D/g, ""),
        linenumber: sender,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      return { ok: false, error: `ghasedak HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "ghasedak failed",
    };
  }
}

export async function sendTransactionalSms(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isOrderSmsConfigured()) {
    return { ok: false, error: "order SMS not configured" };
  }
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { ok: false, error: "invalid phone" };
  }
  const provider = getSmsProvider();
  if (provider === "melipayamak") {
    return sendViaMelipayamak(normalized, message);
  }
  if (provider === "ghasedak") {
    return sendViaGhasedak(normalized, message);
  }
  return sendViaKavenegar(normalized, message);
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
 */
export async function notifyOrderStatusChange(
  order: StoredOrder,
  event: OrderNotifyEvent,
): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  if (!isOrderSmsConfigured()) {
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

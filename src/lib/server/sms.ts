import { normalizePhone } from "@/lib/auth/phone";

export type SmsProvider = "melipayamak" | "kavenegar" | "ghasedak";

export function getSmsProvider(): SmsProvider {
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

/** True when a free-text (non-OTP-template) SMS channel is configured. */
export function isTransactionalSmsConfigured(): boolean {
  const provider = getSmsProvider();
  if (provider === "melipayamak") {
    return Boolean(melipayamakSimpleUrl());
  }
  return Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER);
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

/**
 * Free-text SMS for admin manual send (and optional order notify when enabled).
 * Does not use OTP template endpoints.
 */
export async function sendTransactionalSms(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isTransactionalSmsConfigured()) {
    return { ok: false, error: "transactional SMS not configured" };
  }
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { ok: false, error: "invalid phone" };
  }
  const text = message.trim();
  if (!text) {
    return { ok: false, error: "empty message" };
  }
  const provider = getSmsProvider();
  if (provider === "melipayamak") {
    return sendViaMelipayamak(normalized, text);
  }
  if (provider === "ghasedak") {
    return sendViaGhasedak(normalized, text);
  }
  return sendViaKavenegar(normalized, text);
}

/** Auto order-status SMS is off unless explicitly enabled. */
export function isOrderSmsEnabled(): boolean {
  const raw = process.env.ORDER_SMS_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

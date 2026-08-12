/**
 * Zibal (زیبال) IPG helpers.
 * Merchant only from env: ZIBAL_MERCHANT (use "zibal" for sandbox/test).
 * Docs: https://help.zibal.ir/ipg
 */

const GATEWAY_BASE = "https://gateway.zibal.ir";

export type ZibalRequestResult = {
  result: number;
  trackId?: number;
  message?: string;
};

export type ZibalVerifyResult = {
  result: number;
  message?: string;
  amount?: number | string;
  refNumber?: string | number;
  status?: number;
  paidAt?: string;
  orderId?: string;
  cardNumber?: string;
};

const REQUEST_RESULT_MESSAGES: Record<number, string> = {
  100: "موفق",
  102: "merchant یافت نشد",
  103: "merchant غیرفعال است",
  104: "merchant نامعتبر است",
  105: "مبلغ باید بیشتر از ۱۰۰۰ ریال باشد",
  106: "callbackUrl نامعتبر است",
  113: "مبلغ بیشتر از سقف مجاز است",
};

const VERIFY_RESULT_MESSAGES: Record<number, string> = {
  100: "موفق",
  102: "merchant یافت نشد",
  103: "merchant غیرفعال است",
  104: "merchant نامعتبر است",
  201: "قبلاً تأیید شده",
  202: "پرداخت ناموفق",
  203: "trackId نامعتبر است",
};

export function getZibalMerchant(): string | null {
  const id = process.env.ZIBAL_MERCHANT?.trim();
  if (!id || id === "your_merchant_id") return null;
  return id;
}

export function isZibalConfigured(): boolean {
  return Boolean(getZibalMerchant());
}

/** True when using Zibal's official test merchant string. */
export function isZibalSandboxMerchant(): boolean {
  return getZibalMerchant()?.toLowerCase() === "zibal";
}

export function zibalRequestUrl(): string {
  return `${GATEWAY_BASE}/v1/request`;
}

export function zibalVerifyUrl(): string {
  return `${GATEWAY_BASE}/v1/verify`;
}

export function zibalInquiryUrl(): string {
  return `${GATEWAY_BASE}/v1/inquiry`;
}

export function zibalStartPayUrl(trackId: string | number): string {
  return `${GATEWAY_BASE}/start/${encodeURIComponent(String(trackId))}`;
}

export function zibalRequestResultMessage(result: number): string {
  return REQUEST_RESULT_MESSAGES[result] ?? `خطای زیبال (کد ${result})`;
}

export function zibalVerifyResultMessage(result: number): string {
  return VERIFY_RESULT_MESSAGES[result] ?? `خطای تأیید زیبال (کد ${result})`;
}

/** Fresh success (100) or already-verified (201) — both OK for idempotent settle. */
export function isZibalVerifySuccess(result: number): boolean {
  return result === 100 || result === 201;
}

export function isZibalRefundConfigured(): boolean {
  const flag = process.env.ZIBAL_REFUND_ENABLED?.trim().toLowerCase();
  const enabled = flag === "1" || flag === "true" || flag === "yes";
  return enabled && Boolean(process.env.ZIBAL_API_KEY?.trim());
}

const FETCH_TIMEOUT_MS = 20_000;

export async function zibalPostJson<T>(
  url: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => null)) as T | null;
  if (data == null) {
    throw new Error(`پاسخ نامعتبر از زیبال (HTTP ${res.status})`);
  }
  return data;
}

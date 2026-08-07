/**
 * Zarinpal gateway endpoints + merchant resolution.
 * Set ZARINPAL_SANDBOX=true for local testing (any 36-char merchant UUID).
 */

const PROD_API = "https://api.zarinpal.com";
const SANDBOX_API = "https://sandbox.zarinpal.com";
const PROD_START = "https://www.zarinpal.com/pg/StartPay";
const SANDBOX_START = "https://sandbox.zarinpal.com/pg/StartPay";

export function isZarinpalSandbox(): boolean {
  const flag = process.env.ZARINPAL_SANDBOX?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function getZarinpalMerchantId(): string | null {
  const id = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!id || id === "your_merchant_id") return null;
  return id;
}

export function isZarinpalConfigured(): boolean {
  return Boolean(getZarinpalMerchantId());
}

export function zarinpalRequestUrl(): string {
  const base = isZarinpalSandbox() ? SANDBOX_API : PROD_API;
  return `${base}/pg/v4/payment/request.json`;
}

export function zarinpalVerifyUrl(): string {
  const base = isZarinpalSandbox() ? SANDBOX_API : PROD_API;
  return `${base}/pg/v4/payment/verify.json`;
}

export function zarinpalRefundUrl(): string {
  const base = isZarinpalSandbox() ? SANDBOX_API : PROD_API;
  return `${base}/pg/v4/payment/refund.json`;
}

export function zarinpalStartPayUrl(authority: string): string {
  const base = isZarinpalSandbox() ? SANDBOX_START : PROD_START;
  return `${base}/${encodeURIComponent(authority)}`;
}

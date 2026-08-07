import { normalizePhone, toAsciiDigits } from "@/lib/auth/phone";

/**
 * Live input mask for Iranian mobile fields.
 * Converts Persian/Arabic digits, strips junk, accepts +98 paste, formats as `09xx xxx xxxx`.
 */
export function formatPhoneInput(raw: string): string {
  const full = normalizePhone(raw);
  let digits = full ?? toAsciiDigits(raw);

  if (!full) {
    if (digits.startsWith("0098")) digits = digits.slice(4);
    else if (digits.startsWith("98") && digits.length > 2) digits = digits.slice(2);

    // Local 9xxxxxxxxx → 09… (skip while still on bare country "98")
    if (digits.startsWith("9") && !digits.startsWith("09")) {
      digits = `0${digits}`;
    }
  }

  digits = digits.slice(0, 11);

  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Canonical `09…` when valid; otherwise ASCII digits for partial input. */
export function normalizePhoneInput(formatted: string): string {
  return normalizePhone(formatted) ?? toAsciiDigits(formatted);
}

export function isValidIranMobile(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

export function maskPhone(phone: string): string {
  const d = normalizePhone(phone) ?? toAsciiDigits(phone);
  if (d.length < 7) return phone;
  return `${d.slice(0, 4)}***${d.slice(-4)}`;
}

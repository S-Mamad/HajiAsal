/** Format Iranian mobile: 09xx xxx xxxx */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function normalizePhoneInput(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(normalizePhoneInput(phone));
}

export function maskPhone(phone: string): string {
  const d = normalizePhoneInput(phone);
  if (d.length < 7) return phone;
  return `${d.slice(0, 4)}***${d.slice(-4)}`;
}

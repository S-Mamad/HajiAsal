/** Shared client/server validation for seller applications. */

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

/** Iranian national ID checksum (10 digits). */
export function isValidNationalId(raw: string): boolean {
  const code = normalizeDigits(raw);
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  const check = Number(code[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(code[i]) * (10 - i);
  }
  const rem = sum % 11;
  return rem < 2 ? check === rem : check === 11 - rem;
}

export function isValidBankCard(raw: string): boolean {
  const card = normalizeDigits(raw);
  if (!/^\d{16}$/.test(card)) return false;
  // Luhn
  let sum = 0;
  let alt = false;
  for (let i = card.length - 1; i >= 0; i--) {
    let n = Number(card[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function parseBirthDate(raw: string): Date | null {
  const s = raw.trim();
  // Accept YYYY-MM-DD (HTML date input / ISO)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

export function isAtLeast18(birthDate: Date, now = new Date()): boolean {
  const y = birthDate.getUTCFullYear();
  const m = birthDate.getUTCMonth();
  const d = birthDate.getUTCDate();
  let age = now.getUTCFullYear() - y;
  const nowM = now.getUTCMonth();
  const nowD = now.getUTCDate();
  if (nowM < m || (nowM === m && nowD < d)) age -= 1;
  return age >= 18;
}

export function isNonEmptyText(value: string, min = 2, max = 2000): boolean {
  const t = value.trim();
  return t.length >= min && t.length <= max;
}

export function looksLikeUploadUrl(url: string): boolean {
  if (!url || url.length > 512) return false;
  return (
    url.startsWith("/uploads/seller-applications/") && !url.includes("..")
  );
}

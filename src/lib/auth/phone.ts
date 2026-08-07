/**
 * Iranian mobile numbers — single source of truth.
 * Canonical form stored/sent everywhere: `09xxxxxxxxx` (11 ASCII digits).
 */

/** Persian + Arabic-Indic digits → ASCII, then strip non-digits. */
export function toAsciiDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
}

/**
 * Strip country / trunk prefixes so remaining digits are local mobile.
 * Handles: 0098…, 98… (when long enough to be country + mobile).
 */
function stripIranCountryPrefix(digits: string): string {
  let d = digits;
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length >= 12) d = d.slice(2);
  return d;
}

/**
 * Normalize any common Iranian mobile paste/type to `09xxxxxxxxx`.
 * Accepts spaces, dashes, Persian/Arabic digits, +98 / 0098 / 9xxxxxxxxx.
 */
export function normalizePhone(input: string): string | null {
  let digits = stripIranCountryPrefix(toAsciiDigits(input));

  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }

  if (digits.length === 11 && /^09\d{9}$/.test(digits)) return digits;
  return null;
}

export function isValidIranPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

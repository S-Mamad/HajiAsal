const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Map Persian/Arabic digits to ASCII 0-9. */
export function normalizeSearchDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (ch) => String(PERSIAN_DIGITS.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String(ARABIC_DIGITS.indexOf(ch)));
}

/**
 * Normalize user search input: case, Arabic/Persian letter variants, digits, noise marks.
 */
export function normalizeSearchText(value: string): string {
  return normalizeSearchDigits(
    value
      .trim()
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[\u0640\u200c\u200f\u202a-\u202e]/g, "")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/ة/g, "ه")
      .replace(/ؤ/g, "و")
      .replace(/أ|إ|آ/g, "ا"),
  );
}

/** Split query into tokens; every token must match for multi-word search. */
export function splitSearchTokens(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter((t) => t.length > 0);
}

/** Case/digit-insensitive substring check on normalized haystack. */
export function searchTextIncludes(haystack: string, needle: string): boolean {
  const n = normalizeSearchText(needle);
  if (!n) return true;
  const h = normalizeSearchText(haystack);
  return h.includes(n);
}

/** All query tokens must appear somewhere in the combined haystack. */
export function searchTokensMatch(haystack: string, query: string): boolean {
  const tokens = splitSearchTokens(query);
  if (!tokens.length) return false;
  const h = normalizeSearchText(haystack);
  return tokens.every((t) => h.includes(t));
}

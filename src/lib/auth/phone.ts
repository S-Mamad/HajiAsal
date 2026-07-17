/** Normalize Iranian mobile to 09xxxxxxxxx */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("09")) return digits;
  if (digits.length === 10 && digits.startsWith("9")) return `0${digits}`;
  if (digits.length === 12 && digits.startsWith("989"))
    return `0${digits.slice(2)}`;
  return null;
}

export function isValidIranPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

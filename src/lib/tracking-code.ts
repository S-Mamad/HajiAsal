/** Six-digit order tracking code (e.g. 482731). */
export const TRACKING_CODE_PATTERN = /^\d{6}$/;

export function normalizeTrackingCode(input: string): string {
  return input.trim();
}

export function isValidTrackingCode(code: string): boolean {
  return TRACKING_CODE_PATTERN.test(normalizeTrackingCode(code));
}

export function generateSixDigitCode(): string {
  const n = Math.floor(100_000 + Math.random() * 900_000);
  return String(n);
}

/** Match new 6-digit codes and legacy TRK-* codes. */
export function trackingCodesMatch(
  stored: string | undefined,
  input: string,
): boolean {
  if (!stored) return false;
  const a = normalizeTrackingCode(input);
  const b = normalizeTrackingCode(stored);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.toUpperCase() === b.toUpperCase();
}

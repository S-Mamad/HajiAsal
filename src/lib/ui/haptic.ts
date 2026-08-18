/** Short device vibration when Vibration API is available (mobile browsers). */
export function hapticPulse(ms = 50): void {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore unavailable / blocked vibration */
  }
}

/** Soft tap — sheet snap, chip select */
export function hapticLight(): void {
  hapticPulse(12);
}

/** Confirm action — pay press */
export function hapticMedium(): void {
  hapticPulse(28);
}

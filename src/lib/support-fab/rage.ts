export function isRageClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest(
    "button, [role='button'], input, select, textarea, a",
  );
  if (!control) return false;
  if (control.getAttribute("aria-disabled") === "true") return true;
  if (control.classList.contains("disabled")) return true;
  if (control instanceof HTMLButtonElement && control.disabled) return true;
  if (control instanceof HTMLInputElement && control.disabled) return true;
  if (control instanceof HTMLSelectElement && control.disabled) return true;
  if (control instanceof HTMLTextAreaElement && control.disabled) return true;
  return false;
}

export function shouldTriggerRageAssist(
  timestamps: number[],
  now: number,
  windowMs = 1500,
  minClicks = 3,
): boolean {
  return timestamps.filter((time) => now - time <= windowMs).length >= minClicks;
}

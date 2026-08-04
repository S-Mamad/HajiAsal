/** Profile is complete when a non-empty full name is stored. */
export function isProfileComplete(
  fullName: string | null | undefined,
): boolean {
  return Boolean(fullName?.trim());
}

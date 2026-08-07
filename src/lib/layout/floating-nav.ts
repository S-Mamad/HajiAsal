import { hajiasalPath } from "@/lib/paths";

/**
 * Mobile dock is a fixed full-bleed tab bar (not a floating glass pill).
 * Shown on browse surfaces including PDP so cart stays reachable.
 * Hidden on focus flows (auth, checkout, account).
 */
export function shouldShowFloatingNav(pathname: string): boolean {
  const p = pathname || "/";
  if (p.startsWith(hajiasalPath("/account"))) return false;
  if (p.startsWith(hajiasalPath("/checkout"))) return false;
  if (p.startsWith(hajiasalPath("/login"))) return false;
  if (p.startsWith(hajiasalPath("/register"))) return false;
  if (p.startsWith(hajiasalPath("/forgot-password"))) return false;
  return true;
}

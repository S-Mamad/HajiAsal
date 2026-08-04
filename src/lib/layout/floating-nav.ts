import { hajiasalPath } from "@/lib/paths";

/**
 * Floating glass nav is for browse/chrome, not focus surfaces
 * (auth, checkout, account tabs, product PDP sticky CTA).
 */
export function shouldShowFloatingNav(pathname: string): boolean {
  const p = pathname || "/";
  if (p.startsWith(hajiasalPath("/account"))) return false;
  if (p.startsWith(hajiasalPath("/checkout"))) return false;
  if (p.startsWith(hajiasalPath("/login"))) return false;
  if (p.startsWith(hajiasalPath("/register"))) return false;
  if (p.startsWith(hajiasalPath("/forgot-password"))) return false;
  if (p.startsWith(hajiasalPath("/product/"))) return false;
  return true;
}

import { hajiasalPath } from "@/lib/paths";
import { isAccountTicketChatPath } from "@/lib/account/ticket-chat-path";

/**
 * Mobile dock is a fixed full-bleed tab bar.
 * Shown on browse surfaces and account (shared chrome so حساب stays in-store).
 * Hidden on focus flows (auth, checkout, immersive ticket chat).
 */
export function shouldShowFloatingNav(pathname: string): boolean {
  const p = pathname || "/";
  if (isAccountTicketChatPath(p)) return false;
  if (p.startsWith(hajiasalPath("/checkout"))) return false;
  if (p.startsWith(hajiasalPath("/login"))) return false;
  if (p.startsWith(hajiasalPath("/register"))) return false;
  if (p.startsWith(hajiasalPath("/forgot-password"))) return false;
  return true;
}

/**
 * Cart and checkout keep a persistent pay bar. Hide the site footer so
 * content cannot scroll underneath it.
 */
export function shouldHideStoreFooter(pathname: string): boolean {
  const p = pathname || "/";
  return (
    p.startsWith(hajiasalPath("/cart")) ||
    p.startsWith(hajiasalPath("/checkout"))
  );
}

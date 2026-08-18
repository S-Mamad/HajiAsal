import type { SessionPayload } from "@/types/auth";
import {
  getAdminAuthFromCustomerSession,
  type AdminAuthContext,
} from "@/lib/server/admin-auth";
import {
  getSellerByPhoneAsync,
  type Seller,
} from "@/lib/server/sellers-store";
import {
  hajiasalPath,
  sitePublicUrl,
} from "@/lib/paths";
import { safeAuthRedirect } from "@/lib/safe-redirect";

export async function resolveAdminFromCustomerSession(
  session: SessionPayload | null | undefined,
): Promise<AdminAuthContext> {
  return getAdminAuthFromCustomerSession(session);
}

export async function resolveSellerFromCustomerSession(
  session: SessionPayload | null | undefined,
): Promise<Seller | null> {
  if (!session?.phone) return null;

  const seller = await getSellerByPhoneAsync(session.phone);
  if (!seller || seller.status !== "active") return null;
  return seller;
}

/**
 * Login URL that returns to a panel path after OTP.
 * Login is same-origin on every surface so the session cookie is set on
 * the host that actually serves the panel (no admin↔storefront refresh loop).
 */
export function storefrontLoginUrl(returnTo: string): string {
  const fallback =
    returnTo.startsWith("/seller") || returnTo.includes("/seller")
      ? hajiasalPath("/seller")
      : hajiasalPath("/admin");

  const safeReturn = safeAuthRedirect(returnTo, fallback);
  const relative =
    safeReturn.startsWith("/") && !safeReturn.startsWith("//")
      ? safeReturn
      : fallback;

  return `${hajiasalPath("/login")}?redirect=${encodeURIComponent(relative)}`;
}

export function panelSupportUrl(): string {
  return `${sitePublicUrl()}/contact`;
}

export function panelHomeUrl(): string {
  return sitePublicUrl() || "/";
}

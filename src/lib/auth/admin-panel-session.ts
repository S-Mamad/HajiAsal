import { getSessionFromCookies } from "@/lib/auth/session";
import {
  resolveAdminFromCustomerSession,
  storefrontLoginUrl,
} from "@/lib/auth/panel-access";
import {
  ensurePrimaryAdmins,
  type AdminAuthContext,
} from "@/lib/server/admin-auth";
import type { SessionPayload } from "@/types/auth";
import { hajiasalPath } from "@/lib/paths";

export type AdminPanelSessionState =
  | { kind: "login"; loginUrl: string }
  | { kind: "denied"; session: SessionPayload }
  | { kind: "ok"; session: SessionPayload; ctx: AdminAuthContext };

/**
 * Shared gate for /admin and /admin/* RSC.
 * Seeds primary phones BEFORE eligibility check so OTP-on-/login
 * (which jumps to /admin/dashboard and skips /admin) still unlocks the panel.
 */
export async function loadAdminPanelSession(
  loginReturnPath = hajiasalPath("/admin/dashboard"),
): Promise<AdminPanelSessionState> {
  try {
    await ensurePrimaryAdmins();
  } catch (error) {
    console.error(
      "[admin] ensurePrimaryAdmins:",
      error instanceof Error ? error.message : error,
    );
  }

  const session = await getSessionFromCookies();
  if (!session) {
    return { kind: "login", loginUrl: storefrontLoginUrl(loginReturnPath) };
  }

  const ctx = await resolveAdminFromCustomerSession(session);
  if (!ctx.authenticated) {
    return { kind: "denied", session };
  }

  return { kind: "ok", session, ctx };
}

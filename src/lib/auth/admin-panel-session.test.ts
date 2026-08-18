import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionPayload } from "@/types/auth";

vi.mock("@/lib/auth/session", () => ({
  getSessionFromCookies: vi.fn(),
}));

vi.mock("@/lib/auth/panel-access", () => ({
  resolveAdminFromCustomerSession: vi.fn(),
  storefrontLoginUrl: (path: string) => `/login?redirect=${encodeURIComponent(path)}`,
}));

vi.mock("@/lib/server/admin-auth", () => ({
  ensurePrimaryAdmins: vi.fn(),
}));

import { getSessionFromCookies } from "@/lib/auth/session";
import { resolveAdminFromCustomerSession } from "@/lib/auth/panel-access";
import { ensurePrimaryAdmins } from "@/lib/server/admin-auth";
import { loadAdminPanelSession } from "@/lib/auth/admin-panel-session";

const session: SessionPayload = {
  userId: "u1",
  phone: "09351925900",
  fullName: "Admin",
  exp: Date.now() + 60_000,
};

describe("loadAdminPanelSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("seeds primary admins before eligibility check", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(session);
    vi.mocked(resolveAdminFromCustomerSession).mockResolvedValue({
      authenticated: true,
      user: null,
      role: "super_admin",
      legacy: false,
    });

    const state = await loadAdminPanelSession();
    expect(ensurePrimaryAdmins).toHaveBeenCalled();
    expect(state.kind).toBe("ok");
  });

  it("sends unauthenticated visitors to same-origin login", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(null);
    const state = await loadAdminPanelSession("/admin/orders");
    expect(ensurePrimaryAdmins).toHaveBeenCalled();
    expect(state).toEqual({
      kind: "login",
      loginUrl: "/login?redirect=%2Fadmin%2Forders",
    });
  });

  it("denies a signed-in customer who is not an admin", async () => {
    vi.mocked(getSessionFromCookies).mockResolvedValue(session);
    vi.mocked(resolveAdminFromCustomerSession).mockResolvedValue({
      authenticated: false,
      user: null,
      role: null,
      legacy: false,
    });

    const state = await loadAdminPanelSession();
    expect(state.kind).toBe("denied");
  });
});

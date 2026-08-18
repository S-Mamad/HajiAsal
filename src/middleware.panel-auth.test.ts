import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session-edge", () => ({
  CUSTOMER_COOKIE: "hajiasal_customer_session",
  getSessionTokenFromRequest: vi.fn(),
  parseSessionTokenEdge: vi.fn(),
}));

vi.mock("@/lib/server/app-role", () => ({
  getAppRole: vi.fn(() => "all"),
  adminPublicUrl: () => "https://admin.hajiasal.ir",
  sellerPublicUrl: () => "https://seller.hajiasal.ir",
  sitePublicUrl: () => "https://hajiasal.ir",
}));

vi.mock("@/lib/server/app-role-path", () => ({
  resolveAppRolePath: vi.fn(() => ({ type: "next" })),
}));

import { middleware } from "@/middleware";
import {
  getSessionTokenFromRequest,
  parseSessionTokenEdge,
} from "@/lib/auth/session-edge";
import { getAppRole } from "@/lib/server/app-role";

const getToken = vi.mocked(getSessionTokenFromRequest);
const parseEdge = vi.mocked(parseSessionTokenEdge);
const appRole = vi.mocked(getAppRole);

function req(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

describe("middleware panel session gate", () => {
  afterEach(() => {
    vi.clearAllMocks();
    appRole.mockReturnValue("all");
  });

  it("redirects unauthenticated /admin/dashboard to /login", async () => {
    getToken.mockReturnValue(null);
    const res = await middleware(req("/admin/dashboard"));
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/login");
    expect(loc).toContain("redirect");
  });

  it("allows /admin/dashboard when customer session parses", async () => {
    getToken.mockReturnValue("tok");
    parseEdge.mockResolvedValue({
      userId: "u1",
      phone: "09120000000",
      fullName: "A",
      exp: Date.now() + 60_000,
    });
    const res = await middleware(req("/admin/dashboard"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("leaves /seller/apply open without session", async () => {
    getToken.mockReturnValue(null);
    const res = await middleware(req("/seller/apply"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("on APP_ROLE=admin redirects to same-origin /login", async () => {
    appRole.mockReturnValue("admin");
    getToken.mockReturnValue(null);
    const res = await middleware(req("/admin/dashboard"));
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/login");
    expect(loc).toContain("redirect");
    expect(loc).not.toContain("https://hajiasal.ir/login");
  });
});

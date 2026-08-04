import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest, authedAdminRequest, makeAdminUser, readJson } from "./harness";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    ensurePrimaryAdmins: vi.fn(async () => undefined),
    getAdminAuthFromToken: vi.fn(),
  };
});

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

import { POST, GET, DELETE } from "@/app/api/admin/auth/route";
import { getAdminAuthFromToken } from "@/lib/server/admin-auth";

describe("admin auth behavior (OTP-only)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST password login is disabled", async () => {
    const res = await POST();
    expect(res.status).toBe(401);
    const json = await readJson(res);
    expect(json.success).toBe(false);
    expect(String(json.message)).toMatch(/پیامک|OTP|کد/i);
  });

  it("GET without cookie returns 401", async () => {
    vi.mocked(getAdminAuthFromToken).mockResolvedValue({
      authenticated: false,
      user: null,
      role: null,
      legacy: false,
    });
    const res = await GET(
      adminRequest("http://localhost/api/admin/auth", { cookie: null }),
    );
    expect(res.status).toBe(401);
  });

  it("GET with valid session returns user and role", async () => {
    const user = makeAdminUser("support", "u2");
    vi.mocked(getAdminAuthFromToken).mockResolvedValue({
      authenticated: true,
      user,
      role: "support",
      legacy: false,
    });
    const res = await GET(authedAdminRequest("http://localhost/api/admin/auth"));
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.authenticated).toBe(true);
    expect(json.role).toBe("support");
    expect(json.legacy).toBe(false);
  });

  it("GET reports legacy session flag", async () => {
    vi.mocked(getAdminAuthFromToken).mockResolvedValue({
      authenticated: true,
      user: null,
      role: "super_admin",
      legacy: true,
    });
    const res = await GET(authedAdminRequest("http://localhost/api/admin/auth"));
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.legacy).toBe(true);
  });

  it("DELETE clears session", async () => {
    const res = await DELETE(
      authedAdminRequest("http://localhost/api/admin/auth", { method: "DELETE" }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.success).toBe(true);
  });
});

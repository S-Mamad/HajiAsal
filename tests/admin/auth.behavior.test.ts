import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest, makeAdminUser, readJson } from "./harness";
import { createSessionToken } from "@/lib/auth/session";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    ensurePrimaryAdmins: vi.fn(async () => undefined),
    getAdminAuthFromCustomerSession: vi.fn(),
  };
});

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

import { POST, GET, DELETE } from "@/app/api/admin/auth/route";
import { getAdminAuthFromCustomerSession } from "@/lib/server/admin-auth";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";

function customerCookie(phone = "09351925900"): string {
  const token = createSessionToken({
    userId: "u1",
    phone,
    fullName: "Admin Test",
  });
  return `hajiasal_customer_session=${token}`;
}

describe("admin auth behavior (storefront session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST password/panel login is gone (410)", async () => {
    const res = await POST();
    expect(res.status).toBe(410);
    const json = await readJson(res);
    expect(json.success).toBe(false);
    expect(String(json.message)).toMatch(/سایت اصلی|ورود/i);
  });

  it("GET without customer session returns 401", async () => {
    vi.mocked(getAdminAuthFromCustomerSession).mockResolvedValue({
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

  it("GET with eligible customer session returns user and role", async () => {
    const user = makeAdminUser("support", "u2");
    user.phone = "09351925900";
    vi.mocked(getAdminAuthFromCustomerSession).mockResolvedValue({
      authenticated: true,
      user,
      role: "support",
      legacy: false,
    });
    const res = await GET(
      adminRequest("http://localhost/api/admin/auth", {
        cookie: customerCookie(),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.authenticated).toBe(true);
    expect(json.role).toBe("support");
    expect(json.legacy).toBe(false);
  });

  it("DELETE clears sibling + customer session cookies", async () => {
    const res = await DELETE(
      adminRequest("http://localhost/api/admin/auth", {
        method: "DELETE",
        cookie: customerCookie(),
      }),
    );
    expect(res.status).toBe(200);
    expect(clearAllAuthSessions).toHaveBeenCalled();
    const json = await readJson(res);
    expect(json.success).toBe(true);
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const joined = setCookie.join(";") || res.headers.get("set-cookie") || "";
    expect(joined).toMatch(/hajiasal_customer_session=/);
  });
});

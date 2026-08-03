import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest, authedAdminRequest, makeAdminUser, readJson } from "./harness";

vi.mock("@/lib/server/admin-rate-limit", () => ({
  checkAdminLoginRateLimit: vi.fn(async () => ({ allowed: true })),
  recordAdminLoginAttempt: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/admin", () => ({
  loginAdmin: vi.fn(async () => "session-token-abcdefghijklmnopqrstuvwxyz"),
  adminCookieOptions: (token: string) => ({
    name: "hajiasal_admin_session",
    value: token,
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24,
  }),
}));

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    authenticateAdminCredentials: vi.fn(),
    touchAdminLogin: vi.fn(async () => undefined),
    getAdminAuthFromToken: vi.fn(),
  };
});

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/client-ip", () => ({
  getTrustedClientIp: vi.fn(() => "127.0.0.1"),
}));

import { POST, GET, DELETE } from "@/app/api/admin/auth/route";
import {
  authenticateAdminCredentials,
  getAdminAuthFromToken,
} from "@/lib/server/admin-auth";
import { loginAdmin } from "@/lib/server/admin";
import {
  checkAdminLoginRateLimit,
  recordAdminLoginAttempt,
} from "@/lib/server/admin-rate-limit";

describe("admin auth behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAdminLoginRateLimit).mockResolvedValue({
      allowed: true,
      remaining: 5,
      retryAfterSec: 0,
      message: "",
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST without password returns 401 and records failure", async () => {
    const res = await POST(
      adminRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cookie: null,
      }),
    );
    expect(res.status).toBe(401);
    expect(recordAdminLoginAttempt).toHaveBeenCalledWith("127.0.0.1", false);
  });

  it("POST with bad credentials returns 401", async () => {
    vi.mocked(authenticateAdminCredentials).mockResolvedValue(null);
    const res = await POST(
      adminRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong", login: "a@b.c" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(401);
    const json = await readJson(res);
    expect(json.success).toBe(false);
  });

  it("POST succeeds and sets session cookie", async () => {
    const user = makeAdminUser("super_admin", "u1");
    vi.mocked(authenticateAdminCredentials).mockResolvedValue({
      user,
      legacy: false,
    });
    const res = await POST(
      adminRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret", login: "a@b.c" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.success).toBe(true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("hajiasal_admin_session=");
  });

  it("POST returns 503 when session cannot be created", async () => {
    const user = makeAdminUser("super_admin", "u1");
    vi.mocked(authenticateAdminCredentials).mockResolvedValue({
      user,
      legacy: false,
    });
    vi.mocked(loginAdmin).mockResolvedValueOnce(null);
    const res = await POST(
      adminRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "secret", login: "a@b.c" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(503);
  });

  it("POST returns 429 when rate-limited", async () => {
    vi.mocked(checkAdminLoginRateLimit).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSec: 900,
      message: "تعداد تلاش بیش از حد",
    } as never);
    const res = await POST(
      adminRequest("http://localhost/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "x" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(429);
    expect(authenticateAdminCredentials).not.toHaveBeenCalled();
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

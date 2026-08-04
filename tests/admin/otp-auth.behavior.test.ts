import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRequest, makeAdminUser, readJson } from "../admin/harness";

vi.mock("@/lib/auth/panel-otp", () => ({
  handlePanelOtpSend: vi.fn(),
  handlePanelOtpVerify: vi.fn(),
}));

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    ensurePrimaryAdmins: vi.fn(async () => undefined),
    findAdminUserByPhone: vi.fn(),
    touchAdminLogin: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/server/admin", () => ({
  loginAdmin: vi.fn(async () => "session-token-abcdefghijklmnopqrstuvwxyz"),
  adminCookieOptions: (token: string) => ({
    name: "hajiasal_admin_session",
    value: token,
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  }),
}));

vi.mock("@/lib/server/admin-rate-limit", () => ({
  checkAdminLoginRateLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 5,
    retryAfterSec: 0,
    message: "",
  })),
  recordAdminLoginAttempt: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/client-ip", () => ({
  getTrustedClientIp: vi.fn(() => "127.0.0.1"),
}));

import { POST as sendOtp } from "@/app/api/admin/auth/otp/send/route";
import { POST as verifyOtp } from "@/app/api/admin/auth/otp/verify/route";
import {
  handlePanelOtpSend,
  handlePanelOtpVerify,
} from "@/lib/auth/panel-otp";
import { findAdminUserByPhone } from "@/lib/server/admin-auth";
import { NextResponse } from "next/server";

describe("admin OTP auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("send delegates to panel otp with allowlist", async () => {
    vi.mocked(handlePanelOtpSend).mockResolvedValue(
      NextResponse.json({ success: true }),
    );
    vi.mocked(findAdminUserByPhone).mockResolvedValue(
      makeAdminUser("super_admin", "a1"),
    );
    const res = await sendOtp(
      adminRequest("http://localhost/api/admin/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09351925900" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(200);
    expect(handlePanelOtpSend).toHaveBeenCalled();
  });

  it("verify creates session for active admin", async () => {
    vi.mocked(handlePanelOtpVerify).mockResolvedValue({
      ok: true,
      phone: "09351925900",
    });
    const user = makeAdminUser("super_admin", "a1");
    user.phone = "09351925900";
    vi.mocked(findAdminUserByPhone).mockResolvedValue(user);

    const res = await verifyOtp(
      adminRequest("http://localhost/api/admin/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09351925900", code: "1234" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.success).toBe(true);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("hajiasal_admin_session=");
  });

  it("verify rejects when admin missing after otp", async () => {
    vi.mocked(handlePanelOtpVerify).mockResolvedValue({
      ok: true,
      phone: "09120000000",
    });
    vi.mocked(findAdminUserByPhone).mockResolvedValue(null);
    const res = await verifyOtp(
      adminRequest("http://localhost/api/admin/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09120000000", code: "1234" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(400);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/otp-store", () => ({
  verifyOtpChallenge: vi.fn(),
}));

vi.mock("@/lib/server/profiles", () => ({
  findProfileByPhone: vi.fn(),
  findOrCreateProfileByPhone: vi.fn(),
  findProfileById: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
  checkRateLimitAsync: vi.fn(async () => ({ ok: true, retryAfterSec: 0 })),
}));

import { POST as verifyOtp } from "@/app/api/auth/otp/verify/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { verifyOtpChallenge } from "@/lib/auth/otp-store";
import {
  findOrCreateProfileByPhone,
  findProfileByPhone,
  updateProfile,
} from "@/lib/server/profiles";
import {
  createSessionToken,
  CUSTOMER_COOKIE,
} from "@/lib/auth/session";
import { normalizeOtpDigits } from "@/lib/auth/otp-digits";

function jsonRequest(
  url: string,
  body: unknown,
  cookie?: string | null,
): Request {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.Cookie = cookie;
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const PHONE = "09123456789";

describe("customer otp verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("S3 rejects invalid otp without session cookie", async () => {
    vi.mocked(verifyOtpChallenge).mockResolvedValue({
      valid: false,
      message: "کد تأیید نادرست است",
    });
    const res = await verifyOtp(
      jsonRequest("http://localhost/api/auth/otp/verify", {
        phone: PHONE,
        code: "0000",
      }),
    );
    expect(res.status).toBe(400);
    const setCookie = res.headers.getSetCookie?.() ?? [];
    expect(setCookie.join(";")).not.toMatch(
      new RegExp(`${CUSTOMER_COOKIE}=[^;]+`),
    );
  });

  it("S4 returns isNewUser false for profile with fullName", async () => {
    vi.mocked(verifyOtpChallenge).mockResolvedValue({ valid: true, message: "" });
    vi.mocked(findProfileByPhone).mockResolvedValue({
      id: "u1",
      phone: PHONE,
      fullName: "علی تستی",
      email: null,
      newsletterOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await verifyOtp(
      jsonRequest("http://localhost/api/auth/otp/verify", {
        phone: PHONE,
        code: "1234",
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.isNewUser).toBe(false);
    expect(data.user.fullName).toBe("علی تستی");
  });

  it("S5 creates profile and marks new user", async () => {
    vi.mocked(verifyOtpChallenge).mockResolvedValue({ valid: true, message: "" });
    vi.mocked(findProfileByPhone).mockResolvedValue(null);
    vi.mocked(findOrCreateProfileByPhone).mockResolvedValue({
      id: "u-new",
      phone: PHONE,
      fullName: null,
      email: null,
      newsletterOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await verifyOtp(
      jsonRequest("http://localhost/api/auth/otp/verify", {
        phone: PHONE,
        code: "1234",
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isNewUser).toBe(true);
    expect(findOrCreateProfileByPhone).toHaveBeenCalledWith(PHONE);
  });

  it("S6 treats empty fullName as new user", async () => {
    vi.mocked(verifyOtpChallenge).mockResolvedValue({ valid: true, message: "" });
    vi.mocked(findProfileByPhone).mockResolvedValue({
      id: "u2",
      phone: PHONE,
      fullName: null,
      email: null,
      newsletterOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await verifyOtp(
      jsonRequest("http://localhost/api/auth/otp/verify", {
        phone: PHONE,
        code: "1234",
      }),
    );
    const data = await res.json();
    expect(data.isNewUser).toBe(true);
  });

  it("S17 accepts persian digits via otp schema normalization", () => {
    expect(normalizeOtpDigits("۱۲۳۴")).toBe("1234");
  });
});

describe("customer register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("S7 rejects without session", async () => {
    const res = await register(
      jsonRequest("http://localhost/api/auth/register", {
        phone: PHONE,
        fullName: "علی تستی",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("S8 rejects phone mismatch", async () => {
    const token = createSessionToken({
      userId: "u1",
      phone: PHONE,
      fullName: null,
    });
    const res = await register(
      jsonRequest(
        "http://localhost/api/auth/register",
        { phone: "09121111111", fullName: "علی تستی" },
        `${CUSTOMER_COOKIE}=${token}`,
      ),
    );
    expect(res.status).toBe(403);
  });

  it("S9 updates profile and refreshes session", async () => {
    const token = createSessionToken({
      userId: "u1",
      phone: PHONE,
      fullName: null,
    });
    vi.mocked(findProfileByPhone).mockResolvedValue({
      id: "u1",
      phone: PHONE,
      fullName: null,
      email: null,
      newsletterOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(updateProfile).mockResolvedValue({
      id: "u1",
      phone: PHONE,
      fullName: "علی تستی",
      email: null,
      newsletterOptIn: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await register(
      jsonRequest(
        "http://localhost/api/auth/register",
        {
          phone: PHONE,
          fullName: "علی تستی",
          newsletterOptIn: true,
        },
        `${CUSTOMER_COOKIE}=${token}`,
      ),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.fullName).toBe("علی تستی");
  });
});

describe("customer logout", () => {
  it("S15 clears customer session cookie", async () => {
    const res = await logout(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.getSetCookie?.() ?? [];
    const joined = setCookie.join("\n");
    expect(joined).toMatch(new RegExp(CUSTOMER_COOKIE));
    expect(joined).toMatch(/Max-Age=0|max-age=0/i);
  });
});

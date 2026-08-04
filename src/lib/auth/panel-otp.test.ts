import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/otp-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/otp-store")>();
  return {
    ...actual,
    createOtpChallenge: vi.fn(async (_phone: string, code?: string) => code ?? "1234"),
    discardOtpChallenge: vi.fn(async () => undefined),
    verifyOtpChallenge: vi.fn(async () => ({
      valid: false,
      message: "کد منقضی شده. دوباره درخواست دهید",
    })),
  };
});

vi.mock("@/lib/auth/get-otp-provider", () => ({
  getOtpProviderForPhone: () => ({
    generatesOwnCode: false,
    send: vi.fn(async () => ({ success: true, message: "sent" })),
  }),
  getTestOtpProvider: () => ({
    isTestPhone: () => false,
    getTestOtp: () => "1234",
  }),
  isTestOtpAllowed: () => false,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
  checkRateLimitAsync: vi.fn(async () => ({ ok: true, retryAfterSec: 0 })),
  peekRateLimitAsync: vi.fn(async () => ({ ok: true, retryAfterSec: 0 })),
  recordRateLimitHitAsync: vi.fn(async () => undefined),
}));

import { createOtpChallenge } from "@/lib/auth/otp-store";
import {
  handlePanelOtpSend,
  handlePanelOtpVerify,
} from "@/lib/auth/panel-otp";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("panel-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid phone format with 400", async () => {
    const res = await handlePanelOtpSend(
      jsonRequest({ phone: "02112345678" }),
      "admin",
      async () => true,
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toMatch(/موبایل/);
    expect(createOtpChallenge).not.toHaveBeenCalled();
  });

  it("ghost-sends for unauthorized phone (no challenge, records limits)", async () => {
    const { recordRateLimitHitAsync } = await import("@/lib/server/rate-limit");
    const res = await handlePanelOtpSend(
      jsonRequest({ phone: "09123456789" }),
      "admin",
      async () => false,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(createOtpChallenge).not.toHaveBeenCalled();
    expect(recordRateLimitHitAsync).toHaveBeenCalled();
  });

  it("creates challenge for allowed phone", async () => {
    const res = await handlePanelOtpSend(
      jsonRequest({ phone: "09123456789" }),
      "seller",
      async () => true,
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(createOtpChallenge).toHaveBeenCalled();
    const key = (createOtpChallenge as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(key).toBe("panel:seller:09123456789");
  });

  it("verify fails with generic message when no challenge", async () => {
    const result = await handlePanelOtpVerify(
      jsonRequest({ phone: "09123456789", code: "1234" }),
      "admin",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    const data = await result.response.json();
    expect(data.message).toBe("کد تأیید نادرست است");
  });
});

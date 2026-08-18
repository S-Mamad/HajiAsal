import { afterEach, describe, expect, it, vi } from "vitest";
import { applySnappayFee, SNAPPPAY_FEE_PERCENT } from "@/lib/server/snappay";

describe("snappay fee", () => {
  it("adds 10 percent to cash total", () => {
    expect(SNAPPPAY_FEE_PERCENT).toBe(10);
    expect(applySnappayFee(100_000)).toBe(110_000);
    expect(applySnappayFee(1)).toBe(1);
  });
});

describe("snappay verify amount fail-closed", () => {
  const prevEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...prevEnv };
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function loadVerify() {
    process.env.SNAPPPAY_BASE_URL = "https://snappay.test";
    process.env.SNAPPPAY_CLIENT_ID = "id";
    process.env.SNAPPPAY_CLIENT_SECRET = "secret";
    process.env.SNAPPPAY_USERNAME = "user";
    process.env.SNAPPPAY_PASSWORD = "pass";
    return (await import("@/lib/server/snappay")).verifyAndSettleSnappay;
  }

  it("rejects when gateway omits amount but expectedAmountRial is set", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth/token")) {
          return {
            ok: true,
            json: async () => ({ access_token: "tok" }),
          };
        }
        if (String(url).includes("/verify")) {
          return {
            ok: true,
            json: async () => ({
              successful: true,
              response: {},
            }),
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const verifyAndSettleSnappay = await loadVerify();
    const result = await verifyAndSettleSnappay("pay-token", {
      expectedAmountRial: 1_100_000,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/مبلغ/);
  });

  it("rejects amount mismatch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/oauth/token")) {
          return {
            ok: true,
            json: async () => ({ access_token: "tok" }),
          };
        }
        if (String(url).includes("/verify")) {
          return {
            ok: true,
            json: async () => ({
              successful: true,
              response: { amount: 500 },
            }),
          };
        }
        throw new Error(`unexpected fetch ${url}`);
      }),
    );

    const verifyAndSettleSnappay = await loadVerify();
    const result = await verifyAndSettleSnappay("pay-token", {
      expectedAmountRial: 1_100_000,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/هم‌خوانی/);
  });
});

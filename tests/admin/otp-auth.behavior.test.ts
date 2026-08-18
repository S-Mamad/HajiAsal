import { describe, expect, it } from "vitest";
import { POST as sendOtp } from "@/app/api/admin/auth/otp/send/route";
import { POST as verifyOtp } from "@/app/api/admin/auth/otp/verify/route";
import { readJson } from "../admin/harness";

describe("admin panel OTP auth (deprecated)", () => {
  it("send returns 410 pointing to storefront login", async () => {
    const res = await sendOtp();
    expect(res.status).toBe(410);
    const json = await readJson(res);
    expect(json.success).toBe(false);
    expect(String(json.message)).toMatch(/ورود|login/i);
  });

  it("verify returns 410", async () => {
    const res = await verifyOtp();
    expect(res.status).toBe(410);
  });
});

import { describe, expect, it } from "vitest";
import { POST as sendOtp } from "@/app/api/seller/auth/otp/send/route";
import { POST as verifyOtp } from "@/app/api/seller/auth/otp/verify/route";

describe("seller panel OTP auth (deprecated)", () => {
  it("send returns 410", async () => {
    const res = await sendOtp();
    expect(res.status).toBe(410);
  });

  it("verify returns 410", async () => {
    const res = await verifyOtp();
    expect(res.status).toBe(410);
  });
});

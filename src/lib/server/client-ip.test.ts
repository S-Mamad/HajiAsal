import { afterEach, describe, expect, it, vi } from "vitest";
import { getTrustedClientIp } from "./client-ip";

describe("getTrustedClientIp", () => {
  afterEach(() => {
    delete process.env.TRUST_X_FORWARDED_FOR;
    vi.unstubAllEnvs();
  });

  it("ignores spoofable forwarded headers by default", () => {
    const req = new Request("https://hajiasal.ir/", {
      headers: {
        "x-real-ip": "1.2.3.4",
        "cf-connecting-ip": "5.6.7.8",
        "x-vercel-forwarded-for": "9.9.9.9",
        "x-forwarded-for": "8.8.8.8",
      },
    });
    expect(getTrustedClientIp(req)).toBe("unknown");
  });

  it("honors proxy headers only when TRUST_X_FORWARDED_FOR=true", () => {
    vi.stubEnv("TRUST_X_FORWARDED_FOR", "true");
    const req = new Request("https://hajiasal.ir/", {
      headers: { "x-real-ip": "1.2.3.4" },
    });
    expect(getTrustedClientIp(req)).toBe("1.2.3.4");
  });
});

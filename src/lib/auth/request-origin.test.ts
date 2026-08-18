import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedMutationOrigin } from "./request-origin";

describe("isTrustedMutationOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows all origins outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    const req = new Request("http://localhost/api/auth/otp/send", {
      method: "POST",
      headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
    });
    expect(isTrustedMutationOrigin(req)).toBe(true);
  });

  it("rejects cross-site in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hajiasal.ir");
    const req = new Request("https://hajiasal.ir/api/auth/otp/send", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "sec-fetch-site": "cross-site",
      },
    });
    expect(isTrustedMutationOrigin(req)).toBe(false);
  });

  it("allows configured storefront origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hajiasal.ir");
    const req = new Request("https://hajiasal.ir/api/auth/otp/send", {
      method: "POST",
      headers: {
        origin: "https://hajiasal.ir",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isTrustedMutationOrigin(req)).toBe(true);
  });

  it("allows OTP from the admin host (same-origin login)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hajiasal.ir");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "https://admin.hajiasal.ir");
    const req = new Request("https://admin.hajiasal.ir/api/auth/otp/send", {
      method: "POST",
      headers: {
        origin: "https://admin.hajiasal.ir",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isTrustedMutationOrigin(req)).toBe(true);
  });

  it("allows OTP from the seller host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SELLER_URL", "https://seller.hajiasal.ir");
    const req = new Request("https://seller.hajiasal.ir/api/auth/otp/verify", {
      method: "POST",
      headers: {
        origin: "https://seller.hajiasal.ir",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(isTrustedMutationOrigin(req)).toBe(true);
  });
});

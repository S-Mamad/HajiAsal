import { describe, expect, it, afterEach, vi } from "vitest";
import {
  getAuthCookieDomain,
  authCookieBaseOptions,
} from "@/lib/auth/cookie-domain";
import {
  safeAuthRedirect,
  safeInternalRedirect,
} from "@/lib/safe-redirect";

describe("getAuthCookieDomain", () => {
  afterEach(() => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_SELLER_URL;
    vi.unstubAllEnvs();
  });

  it("returns undefined when unset in non-production", () => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    vi.stubEnv("NODE_ENV", "test");
    expect(getAuthCookieDomain()).toBeUndefined();
  });

  it("returns trimmed domain", () => {
    process.env.AUTH_COOKIE_DOMAIN = " .hajiasal.ir ";
    expect(getAuthCookieDomain()).toBe(".hajiasal.ir");
  });

  it("rejects path-like values", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".hajiasal.ir/admin";
    expect(getAuthCookieDomain()).toBeUndefined();
  });

  it("derives shared domain in production when AUTH unset", () => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hajiasal.ir");
    vi.stubEnv("NEXT_PUBLIC_ADMIN_URL", "https://admin.hajiasal.ir");
    vi.stubEnv("NEXT_PUBLIC_SELLER_URL", "https://seller.hajiasal.ir");
    expect(getAuthCookieDomain()).toBe(".hajiasal.ir");
  });
});

describe("authCookieBaseOptions", () => {
  afterEach(() => {
    delete process.env.AUTH_COOKIE_DOMAIN;
  });

  it("omits domain when unset", () => {
    delete process.env.AUTH_COOKIE_DOMAIN;
    const opts = authCookieBaseOptions({ maxAge: 100 });
    expect(opts.domain).toBeUndefined();
    expect(opts.maxAge).toBe(100);
    expect(opts.path).toBe("/");
    expect(opts.sameSite).toBe("lax");
  });

  it("includes domain when set", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".hajiasal.ir";
    const opts = authCookieBaseOptions({ maxAge: 0 });
    expect(opts.domain).toBe(".hajiasal.ir");
    expect(opts.maxAge).toBe(0);
  });
});

describe("safeInternalRedirect", () => {
  it("allows relative paths", () => {
    expect(safeInternalRedirect("/account")).toBe("/account");
    expect(safeInternalRedirect("/admin/dashboard")).toBe("/admin/dashboard");
  });

  it("blocks protocol-relative and absolute", () => {
    expect(safeInternalRedirect("//evil.com", "/fallback")).toBe("/fallback");
    expect(safeInternalRedirect("https://evil.com", "/fallback")).toBe(
      "/fallback",
    );
  });
});

describe("safeAuthRedirect", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_SELLER_URL;
  });

  it("allows relative paths", () => {
    expect(safeAuthRedirect("/account")).toBe("/account");
  });

  it("blocks open redirects", () => {
    expect(safeAuthRedirect("//evil.com", "/fb")).toBe("/fb");
    expect(safeAuthRedirect("https://evil.com/x", "/fb")).toBe("/fb");
  });

  it("allows admin and seller absolute URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://hajiasal.ir";
    process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.hajiasal.ir";
    process.env.NEXT_PUBLIC_SELLER_URL = "https://seller.hajiasal.ir";

    expect(
      safeAuthRedirect("https://admin.hajiasal.ir/admin/dashboard", "/fb"),
    ).toBe("https://admin.hajiasal.ir/admin/dashboard");
    expect(
      safeAuthRedirect("https://seller.hajiasal.ir/seller/dashboard", "/fb"),
    ).toBe("https://seller.hajiasal.ir/seller/dashboard");
  });

  it("allows localhost absolute outside production", () => {
    expect(safeAuthRedirect("http://localhost:3000/admin", "/fb")).toBe(
      "http://localhost:3000/admin",
    );
  });

  it("rejects localhost when NODE_ENV is production", () => {
    const prev = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");
    expect(safeAuthRedirect("http://localhost:3000/admin", "/fb")).toBe("/fb");
    if (prev) vi.stubEnv("NODE_ENV", prev);
    else vi.unstubAllEnvs();
  });

  it("rejects /login targets that would soft-loop", () => {
    expect(safeAuthRedirect("/login", "/fb")).toBe("/fb");
    expect(safeAuthRedirect("/login?redirect=/account", "/fb")).toBe("/fb");
    process.env.NEXT_PUBLIC_SITE_URL = "https://hajiasal.ir";
    expect(safeAuthRedirect("https://hajiasal.ir/login", "/fb")).toBe("/fb");
  });
});

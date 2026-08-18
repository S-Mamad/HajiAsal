import { afterEach, describe, expect, it } from "vitest";
import {
  applySessionCookieToResponse,
  clearSessionCookieOnResponse,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";

describe("session cookie domain wiring", () => {
  afterEach(() => {
    delete process.env.AUTH_COOKIE_DOMAIN;
  });

  it("sessionCookieOptions includes domain when AUTH_COOKIE_DOMAIN is set", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".hajiasal.ir";
    const token = createSessionToken({
      userId: "u1",
      phone: "09120000000",
      fullName: "Test",
    });
    const opts = sessionCookieOptions(token);
    expect(opts.domain).toBe(".hajiasal.ir");
  });

  it("applySessionCookieToResponse passes domain through", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".hajiasal.ir";
    const token = createSessionToken({
      userId: "u1",
      phone: "09120000000",
      fullName: "Test",
    });
    const calls: Array<{ name: string; value: string; options: Record<string, unknown> }> =
      [];
    const response = {
      cookies: {
        set(name: string, value: string, options: Record<string, unknown>) {
          calls.push({ name, value, options });
        },
      },
    };
    applySessionCookieToResponse(response, token);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.name).toBe("hajiasal_customer_session");
    expect(calls[0]!.options.domain).toBe(".hajiasal.ir");
    expect(calls[0]!.options.httpOnly).toBe(true);
  });

  it("clearSessionCookieOnResponse clears with same domain", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".hajiasal.ir";
    const calls: Array<{ options: Record<string, unknown> }> = [];
    const response = {
      cookies: {
        set(_n: string, _v: string, options: Record<string, unknown>) {
          calls.push({ options });
        },
      },
    };
    clearSessionCookieOnResponse(response);
    expect(calls[0]!.options.domain).toBe(".hajiasal.ir");
    expect(calls[0]!.options.maxAge).toBe(0);
  });
});

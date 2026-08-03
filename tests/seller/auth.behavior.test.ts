import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeSeller,
  readJson,
  sellerRequest,
  authedSellerRequest,
} from "./harness";

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ ok: true, remaining: 5, retryAfterSec: 0 })),
  checkRateLimitAsync: vi.fn(async () => ({
    ok: true,
    remaining: 5,
    retryAfterSec: 0,
  })),
  getTrustedClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerByPhoneAsync: vi.fn(),
    verifySellerPassword: vi.fn(),
    createSellerSession: vi.fn(),
    getSellerFromRequest: vi.fn(),
    sellerCookieOptions: (token: string) => ({
      name: "hajiasal_seller_session",
      value: token,
      httpOnly: true,
      secure: false,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }),
    toPublicSeller: actual.toPublicSeller,
  };
});

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

import { POST, GET, DELETE } from "@/app/api/seller/auth/route";
import {
  getSellerByPhoneAsync,
  verifySellerPassword,
  createSellerSession,
  getSellerFromRequest,
} from "@/lib/server/sellers";
import { checkRateLimitAsync } from "@/lib/server/rate-limit";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";

describe("seller auth behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      ok: true,
      remaining: 5,
      retryAfterSec: 0,
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST with invalid body returns 400", async () => {
    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "1", password: "x" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST with unknown / inactive seller returns 401", async () => {
    vi.mocked(getSellerByPhoneAsync).mockResolvedValue(null);
    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09121111111", password: "seller123" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(401);
    const json = await readJson(res);
    expect(json.success).toBe(false);
  });

  it("POST with inactive seller status returns 401", async () => {
    vi.mocked(getSellerByPhoneAsync).mockResolvedValue(
      makeSeller({ status: "suspended" }),
    );
    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09121111111", password: "seller123" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST with bad password returns 401", async () => {
    vi.mocked(getSellerByPhoneAsync).mockResolvedValue(makeSeller());
    vi.mocked(verifySellerPassword).mockReturnValue(false);
    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09121111111", password: "wrong-pass" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("POST succeeds and sets session cookie", async () => {
    const seller = makeSeller({ id: "s1" });
    vi.mocked(getSellerByPhoneAsync).mockResolvedValue(seller);
    vi.mocked(verifySellerPassword).mockReturnValue(true);
    vi.mocked(createSellerSession).mockResolvedValue({
      token: "session-token-abcdefghijklmnopqrstuvwxyz",
    });

    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09121111111", password: "seller123" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.success).toBe(true);
    expect(clearAllAuthSessions).toHaveBeenCalled();
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("hajiasal_seller_session=");
  });

  it("POST returns 503 when session cannot be created", async () => {
    vi.mocked(getSellerByPhoneAsync).mockResolvedValue(makeSeller());
    vi.mocked(verifySellerPassword).mockReturnValue(true);
    vi.mocked(createSellerSession).mockResolvedValue(null);

    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09121111111", password: "seller123" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(503);
  });

  it("POST returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimitAsync).mockResolvedValue({
      ok: false,
      remaining: 0,
      retryAfterSec: 60,
    } as never);
    const res = await POST(
      sellerRequest("http://localhost/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "09121111111", password: "seller123" }),
        cookie: null,
      }),
    );
    expect(res.status).toBe(429);
  });

  it("GET returns 401 when unauthenticated", async () => {
    vi.mocked(getSellerFromRequest).mockResolvedValue(null);
    const res = await GET(
      sellerRequest("http://localhost/api/seller/auth", { cookie: null }),
    );
    expect(res.status).toBe(401);
  });

  it("GET returns seller when authenticated", async () => {
    vi.mocked(getSellerFromRequest).mockResolvedValue(makeSeller({ id: "s1" }));
    const res = await GET(authedSellerRequest("http://localhost/api/seller/auth"));
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.authenticated).toBe(true);
    expect((json.seller as { id: string }).id).toBe("s1");
  });

  it("DELETE logout clears sibling sessions", async () => {
    const res = await DELETE(
      authedSellerRequest("http://localhost/api/seller/auth", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(200);
    expect(clearAllAuthSessions).toHaveBeenCalled();
    const json = await readJson(res);
    expect(json.success).toBe(true);
  });
});

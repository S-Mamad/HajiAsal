import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeSeller,
  readJson,
  sellerRequest,
  authedSellerRequest,
} from "./harness";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
    toPublicSeller: actual.toPublicSeller,
  };
});

vi.mock("@/lib/auth/clear-sibling-sessions", () => ({
  clearAllAuthSessions: vi.fn(async () => undefined),
}));

import { POST, GET, DELETE } from "@/app/api/seller/auth/route";
import { getSellerFromRequest } from "@/lib/server/sellers";
import { clearAllAuthSessions } from "@/lib/auth/clear-sibling-sessions";

describe("seller auth behavior (storefront session)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("POST password/panel login is gone (410)", async () => {
    void sellerRequest;
    const res = await POST();
    expect(res.status).toBe(410);
    const json = await readJson(res);
    expect(json.success).toBe(false);
    expect(String(json.message)).toMatch(/سایت اصلی|ورود/i);
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

import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import type { SessionPayload } from "@/types/auth";
import type { AdminAuthContext } from "@/lib/server/admin-auth";
import type { Seller } from "@/lib/server/sellers-store";

vi.mock("@/lib/server/admin-auth", () => ({
  getAdminAuthFromCustomerSession: vi.fn(),
}));

vi.mock("@/lib/server/sellers-store", () => ({
  getSellerByPhoneAsync: vi.fn(),
}));

vi.mock("@/lib/server/app-role", () => ({
  getAppRole: vi.fn(() => "all"),
}));

import { getAdminAuthFromCustomerSession } from "@/lib/server/admin-auth";
import { getSellerByPhoneAsync } from "@/lib/server/sellers-store";
import { getAppRole } from "@/lib/server/app-role";
import {
  resolveAdminFromCustomerSession,
  resolveSellerFromCustomerSession,
  storefrontLoginUrl,
} from "@/lib/auth/panel-access";

const resolveAdmin = vi.mocked(getAdminAuthFromCustomerSession);
const findSeller = vi.mocked(getSellerByPhoneAsync);
const appRole = vi.mocked(getAppRole);

function session(phone: string): SessionPayload {
  return {
    userId: "u1",
    phone,
    fullName: "Test",
    exp: Date.now() + 60_000,
  };
}

const emptyAdmin: AdminAuthContext = {
  authenticated: false,
  user: null,
  role: null,
  legacy: false,
};

describe("resolveAdminFromCustomerSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to getAdminAuthFromCustomerSession", async () => {
    resolveAdmin.mockResolvedValue({
      authenticated: true,
      user: null,
      role: "support",
      legacy: false,
    });
    const ctx = await resolveAdminFromCustomerSession(session("09120000000"));
    expect(ctx.authenticated).toBe(true);
    expect(ctx.role).toBe("support");
    expect(resolveAdmin).toHaveBeenCalled();
  });

  it("returns empty when underlying resolver denies", async () => {
    resolveAdmin.mockResolvedValue(emptyAdmin);
    const ctx = await resolveAdminFromCustomerSession(null);
    expect(ctx.authenticated).toBe(false);
  });
});

describe("resolveSellerFromCustomerSession", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns null without session", async () => {
    expect(await resolveSellerFromCustomerSession(undefined)).toBeNull();
  });

  it("returns null when not a seller", async () => {
    findSeller.mockResolvedValue(null);
    expect(
      await resolveSellerFromCustomerSession(session("09121111111")),
    ).toBeNull();
  });

  it("returns null when seller not active", async () => {
    findSeller.mockResolvedValue({
      id: "s1",
      shopName: "Shop",
      ownerName: "Owner",
      phone: "09121111111",
      passwordHash: "x",
      city: "Tehran",
      status: "pending",
      commissionPercent: 0,
      joinedAt: "2020-01-01",
    } as Seller);
    expect(
      await resolveSellerFromCustomerSession(session("09121111111")),
    ).toBeNull();
  });

  it("returns active seller", async () => {
    const seller = {
      id: "s1",
      shopName: "Shop",
      ownerName: "Owner",
      phone: "09121111111",
      passwordHash: "x",
      city: "Tehran",
      status: "active",
      commissionPercent: 0,
      joinedAt: "2020-01-01",
    } as Seller;
    findSeller.mockResolvedValue(seller);
    expect(
      await resolveSellerFromCustomerSession(session("09121111111")),
    ).toEqual(seller);
  });
});

describe("storefrontLoginUrl", () => {
  beforeEach(() => {
    appRole.mockReturnValue("all");
    process.env.NEXT_PUBLIC_SITE_URL = "https://hajiasal.ir";
    process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.hajiasal.ir";
    process.env.NEXT_PUBLIC_SELLER_URL = "https://seller.hajiasal.ir";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses relative login on APP_ROLE=all", () => {
    appRole.mockReturnValue("all");
    const url = storefrontLoginUrl("/admin/dashboard");
    expect(url).toBe("/login?redirect=%2Fadmin%2Fdashboard");
  });

  it("uses relative same-origin login on every APP_ROLE", () => {
    appRole.mockReturnValue("admin");
    const url = storefrontLoginUrl("/admin/dashboard");
    expect(url).toBe("/login?redirect=%2Fadmin%2Fdashboard");
  });

  it("never sends admin/seller login to the storefront host", () => {
    appRole.mockReturnValue("admin");
    const adminUrl = storefrontLoginUrl("/admin/dashboard");
    expect(adminUrl.startsWith("/login?")).toBe(true);
    expect(adminUrl).not.toContain("hajiasal.ir");

    appRole.mockReturnValue("seller");
    const sellerUrl = storefrontLoginUrl("/seller/dashboard");
    expect(sellerUrl).toBe("/login?redirect=%2Fseller%2Fdashboard");
    expect(sellerUrl).not.toContain("hajiasal.ir");
  });
});

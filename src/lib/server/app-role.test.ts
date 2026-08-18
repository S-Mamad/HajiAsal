import { describe, expect, it } from "vitest";
import { resolveAppRolePath } from "./app-role-path";
import {
  adminPublicUrl,
  getAppRole,
  sellerPublicUrl,
  sitePublicUrl,
} from "./app-role";
import { adminCookieOptions } from "@/lib/server/admin";
import { sellerCookieOptions } from "@/lib/server/sellers";
import { getPrimaryAdminPhones } from "@/lib/server/admin-auth";

describe("app-role", () => {
  it("defaults to all when unset in non-production", () => {
    const prev = process.env.APP_ROLE;
    const prevNode = process.env.NODE_ENV;
    delete process.env.APP_ROLE;
    Object.assign(process.env, { NODE_ENV: "development" });
    expect(getAppRole()).toBe("all");
    process.env.APP_ROLE = prev;
    Object.assign(process.env, { NODE_ENV: prevNode });
  });

  it("defaults to storefront when unset in production", () => {
    const prev = process.env.APP_ROLE;
    const prevNode = process.env.NODE_ENV;
    delete process.env.APP_ROLE;
    Object.assign(process.env, { NODE_ENV: "production" });
    expect(getAppRole()).toBe("storefront");
    process.env.APP_ROLE = prev;
    Object.assign(process.env, { NODE_ENV: prevNode });
  });

  it("reads storefront/admin/seller", () => {
    const prev = process.env.APP_ROLE;
    process.env.APP_ROLE = "admin";
    expect(getAppRole()).toBe("admin");
    process.env.APP_ROLE = "seller";
    expect(getAppRole()).toBe("seller");
    process.env.APP_ROLE = "storefront";
    expect(getAppRole()).toBe("storefront");
    process.env.APP_ROLE = prev;
  });

  it("exposes public urls without trailing slash", () => {
    expect(sitePublicUrl().endsWith("/")).toBe(false);
    expect(adminPublicUrl().endsWith("/")).toBe(false);
    expect(sellerPublicUrl().endsWith("/")).toBe(false);
  });
});

describe("resolveAppRolePath", () => {
  it("admin: rewrites root and 404s storefront", () => {
    expect(resolveAppRolePath("admin", "/")).toEqual({
      type: "rewrite",
      pathname: "/admin",
    });
    expect(resolveAppRolePath("admin", "/shop").type).toBe("not_found");
    expect(resolveAppRolePath("admin", "/api/auth/otp/send").type).toBe(
      "next",
    );
    expect(resolveAppRolePath("admin", "/login").type).toBe("next");
    expect(resolveAppRolePath("admin", "/admin/dashboard").type).toBe("next");
    expect(resolveAppRolePath("admin", "/api/telegram/webhook").type).toBe(
      "next",
    );
    expect(resolveAppRolePath("admin", "/api/cron/telegram-digest").type).toBe(
      "next",
    );
    expect(resolveAppRolePath("admin", "/api/cron/telegram-outbox").type).toBe(
      "next",
    );
    expect(resolveAppRolePath("admin", "/robots.txt").type).toBe("not_found");
  });

  it("seller: allows same-origin login and auth APIs", () => {
    expect(resolveAppRolePath("seller", "/")).toEqual({
      type: "rewrite",
      pathname: "/seller",
    });
    expect(resolveAppRolePath("seller", "/login").type).toBe("next");
    expect(resolveAppRolePath("seller", "/api/auth/otp/send").type).toBe(
      "next",
    );
    expect(resolveAppRolePath("seller", "/seller/dashboard").type).toBe("next");
    expect(resolveAppRolePath("seller", "/shop").type).toBe("not_found");
  });

  it("storefront: redirects panels and blocks panel APIs", () => {
    expect(resolveAppRolePath("storefront", "/admin")).toEqual({
      type: "redirect",
      targetBase: "admin",
      pathname: "/admin",
    });
    expect(resolveAppRolePath("storefront", "/seller/dashboard")).toEqual({
      type: "redirect",
      targetBase: "seller",
      pathname: "/seller/dashboard",
    });
    expect(resolveAppRolePath("storefront", "/api/admin/products").type).toBe(
      "not_found",
    );
    expect(resolveAppRolePath("storefront", "/login").type).toBe("next");
  });

  it("all: no locks", () => {
    expect(resolveAppRolePath("all", "/admin").type).toBe("next");
    expect(resolveAppRolePath("all", "/shop").type).toBe("next");
  });
});

describe("panel cookies", () => {
  it("admin cookie is host-only lax 30d", () => {
    const c = adminCookieOptions("tokentokentokentoken");
    expect(c.sameSite).toBe("lax");
    expect(c.path).toBe("/");
    expect(c.maxAge).toBe(60 * 60 * 24 * 30);
    expect(c.httpOnly).toBe(true);
    expect("domain" in c).toBe(false);
  });

  it("seller cookie is host-only lax 30d", () => {
    const c = sellerCookieOptions("tokentokentokentoken");
    expect(c.sameSite).toBe("lax");
    expect(c.path).toBe("/");
    expect(c.maxAge).toBe(60 * 60 * 24 * 30);
    expect("domain" in c).toBe(false);
  });
});

describe("primary admin phones", () => {
  it("defaults to empty when ADMIN_PRIMARY_PHONES is unset", () => {
    const prev = process.env.ADMIN_PRIMARY_PHONES;
    delete process.env.ADMIN_PRIMARY_PHONES;
    expect(getPrimaryAdminPhones()).toEqual([]);
    process.env.ADMIN_PRIMARY_PHONES = prev;
  });
});

import { describe, expect, it } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  canAccessAdminPath,
  findNavItemForPath,
  firstAllowedAdminPath,
  filterNavForRole,
} from "@/lib/admin/nav";
import { can, type AdminRole } from "@/lib/admin/permissions";
import { hajiasalPath } from "@/lib/paths";
import { ADMIN_NAV_PATHS } from "./module-catalog";

const ROLES: AdminRole[] = ["super_admin", "support", "warehouse", "content"];

function allNavHrefs(): string[] {
  const storefront = hajiasalPath("/");
  return ADMIN_NAV_GROUPS.flatMap((g) =>
    g.items.map((i) => i.href).filter((href) => href !== storefront),
  );
}

describe("canAccessAdminPath × roles × nav", () => {
  it("catalog ADMIN_NAV_PATHS matches nav groups", () => {
    const fromNav = new Set(allNavHrefs());
    for (const path of ADMIN_NAV_PATHS) {
      expect(fromNav.has(path)).toBe(true);
    }
  });

  for (const role of ROLES) {
    describe(`role=${role}`, () => {
      for (const href of allNavHrefs()) {
        it(`${href}`, () => {
          const item = findNavItemForPath(href);
          expect(item).not.toBeNull();
          const expected = can(role, item!.permission);
          expect(canAccessAdminPath(role, href)).toBe(expected);
        });
      }
    });
  }

  it("nested product edit path uses products.view", () => {
    const nested = hajiasalPath("/admin/products/p1");
    expect(findNavItemForPath(nested)?.permission).toBe("products.view");
    expect(canAccessAdminPath("warehouse", nested)).toBe(true);
    expect(canAccessAdminPath("support", nested)).toBe(true);
  });

  it("unknown admin path is allowed (API gate owns it)", () => {
    expect(canAccessAdminPath("warehouse", "/admin/unknown-xyz")).toBe(true);
  });

  it("support cannot access settings or users", () => {
    expect(canAccessAdminPath("support", "/admin/settings")).toBe(false);
    expect(canAccessAdminPath("support", "/admin/users")).toBe(false);
    expect(canAccessAdminPath("support", "/admin/logs")).toBe(false);
  });

  it("warehouse cannot access messages or settings", () => {
    expect(canAccessAdminPath("warehouse", "/admin/messages")).toBe(false);
    expect(canAccessAdminPath("warehouse", "/admin/settings")).toBe(false);
    expect(canAccessAdminPath("warehouse", "/admin/coupons")).toBe(false);
  });

  it("content cannot access orders or settings", () => {
    expect(canAccessAdminPath("content", "/admin/orders")).toBe(false);
    expect(canAccessAdminPath("content", "/admin/settings")).toBe(false);
    expect(canAccessAdminPath("content", "/admin/sellers")).toBe(false);
  });

  it("super_admin can access every nav href", () => {
    for (const href of allNavHrefs()) {
      expect(canAccessAdminPath("super_admin", href)).toBe(true);
    }
  });

  it("filterNavForRole hides denied items", () => {
    const supportNav = filterNavForRole("support");
    const hrefs = supportNav.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/admin/settings");
    expect(hrefs).toContain("/admin/orders");
  });

  it("firstAllowedAdminPath is reachable for each role", () => {
    for (const role of ROLES) {
      const path = firstAllowedAdminPath(role);
      expect(canAccessAdminPath(role, path)).toBe(true);
    }
  });
});

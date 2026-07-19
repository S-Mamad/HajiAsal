import { describe, expect, it } from "vitest";
import {
  can,
  isAdminRole,
  permissionsForRole,
  listAllPermissions,
} from "@/lib/admin/permissions";

describe("admin permissions", () => {
  it("recognizes known roles", () => {
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("support")).toBe(true);
    expect(isAdminRole("warehouse")).toBe(true);
    expect(isAdminRole("content")).toBe(true);
    expect(isAdminRole("hacker")).toBe(false);
  });

  it("gives super_admin all permissions", () => {
    expect(can("super_admin", "settings.edit")).toBe(true);
    expect(can("super_admin", "admin_users.manage")).toBe(true);
    expect(permissionsForRole("super_admin")).toEqual(listAllPermissions());
  });

  it("denies support from admin user management", () => {
    expect(can("support", "orders.view")).toBe(true);
    expect(can("support", "admin_users.manage")).toBe(false);
    expect(can("support", "settings.edit")).toBe(false);
  });

  it("allows warehouse inventory but not coupons", () => {
    expect(can("warehouse", "inventory.edit")).toBe(true);
    expect(can("warehouse", "coupons.manage")).toBe(false);
  });

  it("allows content CMS but not refunds", () => {
    expect(can("content", "articles.manage")).toBe(true);
    expect(can("content", "orders.refund")).toBe(false);
  });

  it("denies null/invalid role", () => {
    expect(can(null, "dashboard.view")).toBe(false);
    expect(can(undefined, "dashboard.view")).toBe(false);
    expect(can("guest", "dashboard.view")).toBe(false);
  });
});

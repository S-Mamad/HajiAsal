import { describe, expect, it } from "vitest";
import { canSeller } from "@/lib/seller/capabilities";
import { can } from "@/lib/admin/permissions";

/**
 * Lightweight security matrix: roles/capabilities that must stay denied.
 * Full HTTP gating is covered by E2E + existing gateAdmin/gateSeller usage.
 */
describe("RBAC / capability hard denies", () => {
  it("support cannot manage admin users or settings", () => {
    expect(can("support", "admin_users.manage")).toBe(false);
    expect(can("support", "settings.edit")).toBe(false);
    expect(can("support", "logs.view")).toBe(false);
  });

  it("warehouse cannot refund or manage sellers", () => {
    expect(can("warehouse", "orders.refund")).toBe(false);
    expect(can("warehouse", "sellers.manage")).toBe(false);
  });

  it("default seller cannot manage discounts", () => {
    expect(canSeller(null, "discounts.manage")).toBe(false);
  });
});

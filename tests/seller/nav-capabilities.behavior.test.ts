import { describe, expect, it } from "vitest";
import {
  canAccessSellerPath,
  findSellerNavItemForPath,
  firstAllowedSellerPath,
  getSellerNavGroups,
} from "@/lib/seller/nav";
import {
  DEFAULT_SELLER_CAPABILITIES,
  type SellerCapabilitiesMap,
} from "@/lib/seller/capabilities";
import { hajiasalPath } from "@/lib/paths";
import { SELLER_NAV_PATHS } from "./module-catalog";

function allNavHrefs(): string[] {
  return getSellerNavGroups({
    ...DEFAULT_SELLER_CAPABILITIES,
    "discounts.manage": true,
  }).flatMap((g) => g.items.map((i) => i.href));
}

describe("seller nav × capabilities", () => {
  it("catalog SELLER_NAV_PATHS matches nav groups (with discounts enabled)", () => {
    const fromNav = new Set(allNavHrefs());
    for (const path of SELLER_NAV_PATHS) {
      expect(fromNav.has(path)).toBe(true);
    }
  });

  it("default capabilities hide discounts", () => {
    const hrefs = getSellerNavGroups(null).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    expect(hrefs).not.toContain(hajiasalPath("/seller/discounts"));
    expect(hrefs).toContain(hajiasalPath("/seller/dashboard"));
    expect(hrefs).toContain(hajiasalPath("/seller/products"));
  });

  it("discounts visible when discounts.manage is true", () => {
    const caps: SellerCapabilitiesMap = { "discounts.manage": true };
    const hrefs = getSellerNavGroups(caps).flatMap((g) =>
      g.items.map((i) => i.href),
    );
    expect(hrefs).toContain(hajiasalPath("/seller/discounts"));
  });

  it("canAccessSellerPath respects capability on nav items", () => {
    expect(
      canAccessSellerPath(null, hajiasalPath("/seller/dashboard")),
    ).toBe(true);
    expect(
      canAccessSellerPath(null, hajiasalPath("/seller/discounts")),
    ).toBe(false);
    expect(
      canAccessSellerPath(
        { "discounts.manage": true },
        hajiasalPath("/seller/discounts"),
      ),
    ).toBe(true);
    expect(
      canAccessSellerPath(
        { "products.manage": false },
        hajiasalPath("/seller/products"),
      ),
    ).toBe(false);
    expect(
      canAccessSellerPath(
        { "orders.manage": false },
        hajiasalPath("/seller/orders"),
      ),
    ).toBe(false);
    expect(
      canAccessSellerPath(
        { "wallet.view": false },
        hajiasalPath("/seller/wallet"),
      ),
    ).toBe(false);
  });

  it("nested product edit path uses products.manage", () => {
    const nested = hajiasalPath("/seller/products/p1/edit");
    expect(findSellerNavItemForPath(nested)?.capability).toBe(
      "products.manage",
    );
    expect(canAccessSellerPath(null, nested)).toBe(true);
    expect(
      canAccessSellerPath({ "products.manage": false }, nested),
    ).toBe(false);
  });

  it("unknown seller path is allowed (API gate owns it)", () => {
    expect(
      canAccessSellerPath(null, "/seller/unknown-xyz"),
    ).toBe(true);
  });

  it("firstAllowedSellerPath is reachable", () => {
    const path = firstAllowedSellerPath(null);
    expect(canAccessSellerPath(null, path)).toBe(true);
    expect(path).toBe(hajiasalPath("/seller/dashboard"));
  });

  it("firstAllowedSellerPath skips denied dashboard when all main caps off", () => {
    const caps: SellerCapabilitiesMap = {
      ...DEFAULT_SELLER_CAPABILITIES,
      "products.manage": false,
      "orders.manage": false,
      "inventory.manage": false,
      "customers.view": false,
      "wallet.view": false,
      "reports.view": false,
      "tickets.manage": false,
      "notifications.view": false,
      "reviews.reply": false,
      "qa.reply": false,
      "discounts.manage": false,
      "profile.manage": false,
      "media.manage": false,
      "print.export": false,
      "tools.import_export": false,
      "settings.manage": false,
    };
    // dashboard + activity have no capability — still reachable
    const path = firstAllowedSellerPath(caps);
    expect(path).toBe(hajiasalPath("/seller/dashboard"));
  });

  it("getSellerNavGroups drops empty groups", () => {
    const caps: SellerCapabilitiesMap = {
      ...DEFAULT_SELLER_CAPABILITIES,
      "discounts.manage": false,
    };
    const groups = getSellerNavGroups(caps);
    expect(groups.find((g) => g.id === "growth")).toBeUndefined();
  });
});

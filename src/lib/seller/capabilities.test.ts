import { describe, expect, it } from "vitest";
import {
  canSeller,
  parseCapabilitiesJson,
  resolveCapabilities,
  DEFAULT_SELLER_CAPABILITIES,
} from "@/lib/seller/capabilities";

describe("seller capabilities", () => {
  it("defaults discounts.manage to false", () => {
    const caps = resolveCapabilities(null);
    expect(caps["discounts.manage"]).toBe(false);
    expect(caps["orders.manage"]).toBe(true);
  });

  it("allows override of defaults", () => {
    expect(canSeller({ "discounts.manage": true }, "discounts.manage")).toBe(
      true,
    );
    expect(
      canSeller({ "orders.manage": false }, "orders.manage"),
    ).toBe(false);
  });

  it("parses JSON string capabilities", () => {
    const parsed = parseCapabilitiesJson(
      JSON.stringify({ "discounts.manage": true }),
    );
    expect(parsed["discounts.manage"]).toBe(true);
  });

  it("returns empty map for invalid JSON", () => {
    expect(parseCapabilitiesJson("not-json")).toEqual({});
    expect(parseCapabilitiesJson(42)).toEqual({});
  });

  it("keeps full default key set", () => {
    const keys = Object.keys(resolveCapabilities({}));
    expect(keys.sort()).toEqual(
      Object.keys(DEFAULT_SELLER_CAPABILITIES).sort(),
    );
  });
});

import { describe, expect, it } from "vitest";
import { shippingCostForMethod } from "./order-pricing";

const settings = { shippingCost: 45000, freeShippingThreshold: 500000 };

describe("shippingCostForMethod", () => {
  it("returns 0 for pickup", () => {
    expect(shippingCostForMethod("pickup", 1000, settings)).toBe(0);
  });

  it("applies free-shipping threshold for standard and express", () => {
    expect(shippingCostForMethod("standard", 500000, settings)).toBe(0);
    expect(shippingCostForMethod("express", 500000, settings)).toBe(0);
  });

  it("charges base / express below threshold", () => {
    expect(shippingCostForMethod("standard", 100000, settings)).toBe(45000);
    expect(shippingCostForMethod("express", 100000, settings)).toBe(80000);
  });

  it("ignores threshold when disabled", () => {
    expect(
      shippingCostForMethod("standard", 999999, {
        shippingCost: 45000,
        freeShippingThreshold: 0,
      }),
    ).toBe(45000);
  });

  it("uses admin express and pickup amounts", () => {
    const custom = {
      shippingCost: 45000,
      expressShippingCost: 99000,
      pickupShippingCost: 2000,
      freeShippingThreshold: 500000,
    };
    expect(shippingCostForMethod("express", 100000, custom)).toBe(99000);
    expect(shippingCostForMethod("pickup", 100000, custom)).toBe(2000);
  });
});

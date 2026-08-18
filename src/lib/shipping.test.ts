import { describe, expect, it } from "vitest";
import {
  resolveShippingMethodCopy,
  resolveShippingQuoteSettings,
  shippingCostForMethod,
} from "./shipping";

const base = { shippingCost: 45000, freeShippingThreshold: 500000 };

describe("resolveShippingQuoteSettings", () => {
  it("defaults express to base plus surcharge", () => {
    expect(resolveShippingQuoteSettings(base).expressShippingCost).toBe(80000);
  });

  it("keeps an explicit express amount", () => {
    expect(
      resolveShippingQuoteSettings({
        ...base,
        expressShippingCost: 90000,
      }).expressShippingCost,
    ).toBe(90000);
  });
});

describe("shippingCostForMethod", () => {
  it("returns 0 for pickup by default", () => {
    expect(shippingCostForMethod("pickup", 1000, base)).toBe(0);
  });

  it("charges a custom pickup amount even over free threshold", () => {
    expect(
      shippingCostForMethod("pickup", 900000, {
        ...base,
        pickupShippingCost: 5000,
      }),
    ).toBe(5000);
  });

  it("applies free-shipping threshold for standard and express", () => {
    expect(shippingCostForMethod("standard", 500000, base)).toBe(0);
    expect(shippingCostForMethod("express", 500000, base)).toBe(0);
  });

  it("keeps express charged when free shipping excludes it", () => {
    expect(
      shippingCostForMethod("express", 500000, {
        ...base,
        expressShippingCost: 90000,
        freeShippingIncludesExpress: false,
      }),
    ).toBe(90000);
    expect(
      shippingCostForMethod("standard", 500000, {
        ...base,
        freeShippingIncludesExpress: false,
      }),
    ).toBe(0);
  });

  it("charges base / express below threshold", () => {
    expect(shippingCostForMethod("standard", 100000, base)).toBe(45000);
    expect(shippingCostForMethod("express", 100000, base)).toBe(80000);
    expect(
      shippingCostForMethod("express", 100000, {
        ...base,
        expressShippingCost: 99000,
      }),
    ).toBe(99000);
  });

  it("ignores threshold when disabled", () => {
    expect(
      shippingCostForMethod("standard", 999999, {
        shippingCost: 45000,
        freeShippingThreshold: 0,
      }),
    ).toBe(45000);
  });
});

describe("resolveShippingMethodCopy", () => {
  it("falls back to defaults then overlays admin copy", () => {
    const copy = resolveShippingMethodCopy("express", {
      express: { label: "پیک ویژه", eta: "همان روز" },
    });
    expect(copy.label).toBe("پیک ویژه");
    expect(copy.eta).toBe("همان روز");
    expect(copy.description).toBe("ارسال سریع");
  });
});

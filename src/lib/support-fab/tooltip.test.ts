import { describe, expect, it } from "vitest";
import {
  CART_ASSIST_COPY,
  CHECKOUT_ASSIST_COPY,
  DEFAULT_WELCOME_COPY,
  OOS_ASSIST_COPY,
  RAGE_ASSIST_COPY,
} from "./constants";
import {
  readFlag,
  resolveTooltip,
  shouldShowTooltip,
  writeFlag,
} from "./tooltip";

describe("support fab tooltip", () => {
  it("marks welcome separately from contextual assists", () => {
    expect(
      resolveTooltip({
        pageKind: "home",
        productOutOfStock: false,
        rageAssist: false,
        cartDwellElapsed: false,
      }),
    ).toEqual({ copy: DEFAULT_WELCOME_COPY, kind: "welcome" });
    expect(
      resolveTooltip({
        pageKind: "checkout",
        productOutOfStock: false,
        rageAssist: false,
        cartDwellElapsed: false,
      }),
    ).toEqual({ copy: CHECKOUT_ASSIST_COPY, kind: "context" });
    expect(
      resolveTooltip({
        pageKind: "product",
        productOutOfStock: true,
        rageAssist: false,
        cartDwellElapsed: false,
      }),
    ).toEqual({ copy: OOS_ASSIST_COPY, kind: "context" });
    expect(
      resolveTooltip({
        pageKind: "cart",
        productOutOfStock: false,
        rageAssist: false,
        cartDwellElapsed: true,
      }),
    ).toEqual({ copy: CART_ASSIST_COPY, kind: "context" });
    expect(
      resolveTooltip({
        pageKind: "home",
        productOutOfStock: false,
        rageAssist: true,
        cartDwellElapsed: false,
      }),
    ).toEqual({ copy: RAGE_ASSIST_COPY, kind: "context" });
  });

  it("shows welcome only once per session flag", () => {
    expect(shouldShowTooltip("welcome", false)).toBe(true);
    expect(shouldShowTooltip("welcome", true)).toBe(false);
    expect(shouldShowTooltip("context", true)).toBe(true);
  });

  it("reads and writes a storage flag", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    expect(readFlag(storage, "welcome")).toBe(false);
    writeFlag(storage, "welcome");
    expect(readFlag(storage, "welcome")).toBe(true);
  });
});

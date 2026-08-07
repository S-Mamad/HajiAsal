import { describe, expect, it } from "vitest";
import { shouldShowFloatingNav } from "./floating-nav";

describe("shouldShowFloatingNav", () => {
  it("shows on home, shop, cart, and product pages", () => {
    expect(shouldShowFloatingNav("/")).toBe(true);
    expect(shouldShowFloatingNav("/shop")).toBe(true);
    expect(shouldShowFloatingNav("/cart")).toBe(true);
    expect(shouldShowFloatingNav("/product/mountain-honey")).toBe(true);
    expect(shouldShowFloatingNav("/wishlist")).toBe(true);
  });

  it("hides on auth, account, and checkout", () => {
    expect(shouldShowFloatingNav("/account")).toBe(false);
    expect(shouldShowFloatingNav("/account/orders")).toBe(false);
    expect(shouldShowFloatingNav("/checkout")).toBe(false);
    expect(shouldShowFloatingNav("/login")).toBe(false);
    expect(shouldShowFloatingNav("/register")).toBe(false);
    expect(shouldShowFloatingNav("/forgot-password")).toBe(false);
  });
});

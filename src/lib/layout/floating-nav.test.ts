import { describe, expect, it } from "vitest";
import { shouldHideStoreFooter, shouldShowFloatingNav } from "./floating-nav";

describe("shouldShowFloatingNav", () => {
  it("shows on home, shop, cart, product, and account summary pages", () => {
    expect(shouldShowFloatingNav("/")).toBe(true);
    expect(shouldShowFloatingNav("/shop")).toBe(true);
    expect(shouldShowFloatingNav("/cart")).toBe(true);
    expect(shouldShowFloatingNav("/product/mountain-honey")).toBe(true);
    expect(shouldShowFloatingNav("/wishlist")).toBe(true);
    expect(shouldShowFloatingNav("/account")).toBe(true);
    expect(shouldShowFloatingNav("/account/orders")).toBe(true);
    expect(shouldShowFloatingNav("/account/tickets")).toBe(true);
  });

  it("hides on auth, checkout, and immersive ticket chat", () => {
    expect(shouldShowFloatingNav("/account/tickets/new")).toBe(false);
    expect(shouldShowFloatingNav("/account/tickets/abc-123")).toBe(false);
    expect(shouldShowFloatingNav("/checkout")).toBe(false);
    expect(shouldShowFloatingNav("/login")).toBe(false);
    expect(shouldShowFloatingNav("/register")).toBe(false);
    expect(shouldShowFloatingNav("/forgot-password")).toBe(false);
  });
});

describe("shouldHideStoreFooter", () => {
  it("hides on cart and checkout so the pay bar does not cover footer links", () => {
    expect(shouldHideStoreFooter("/cart")).toBe(true);
    expect(shouldHideStoreFooter("/checkout")).toBe(true);
    expect(shouldHideStoreFooter("/checkout/success")).toBe(true);
  });

  it("keeps the store footer on browse surfaces", () => {
    expect(shouldHideStoreFooter("/")).toBe(false);
    expect(shouldHideStoreFooter("/shop")).toBe(false);
    expect(shouldHideStoreFooter("/wishlist")).toBe(false);
    expect(shouldHideStoreFooter("/account")).toBe(false);
  });
});

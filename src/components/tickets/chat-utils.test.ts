import { describe, expect, it } from "vitest";
import {
  formatRelativeShort,
  isStoreMessengerLayout,
  shellClass,
  storefrontThreadKicker,
  storefrontThreadTitle,
} from "./chat-utils";

describe("ticket chat shell", () => {
  it("keeps the widget canvas flush inside the support FAB", () => {
    const widget = shellClass("storefront", "widget");
    expect(widget).toContain("ticket-chat-canvas");
    expect(widget).not.toContain("rounded-2xl");
    expect(widget).not.toContain("min-h-[28rem]");
  });

  it("uses messenger layout for account fullscreen, not admin embedded", () => {
    expect(isStoreMessengerLayout("storefront", "fullscreen")).toBe(true);
    expect(isStoreMessengerLayout("storefront", "widget")).toBe(true);
    expect(isStoreMessengerLayout("storefront", "embedded")).toBe(false);
    expect(isStoreMessengerLayout("admin", "fullscreen")).toBe(false);
  });

  it("hides generic ticket subjects from the header kicker", () => {
    expect(storefrontThreadTitle()).toBe("پشتیبانی حاجی‌عسل");
    expect(storefrontThreadKicker("گفتگو با پشتیبانی")).toBeNull();
    expect(storefrontThreadKicker("پشتیبانی حاجی‌عسل")).toBeNull();
    expect(storefrontThreadKicker("پیگیری سفارش ۱۲۳")).toBe("پیگیری سفارش ۱۲۳");
  });
});

describe("formatRelativeShort", () => {
  it("uses دقیقه abbreviation د not ق", () => {
    const iso = new Date(Date.now() - 20 * 60_000).toISOString();
    expect(formatRelativeShort(iso)).toMatch(/^\d+د$|^[۰-۹]+د$/);
  });
});

describe("senderLabel", () => {
  it("shows customer name for admin counterpart", async () => {
    const { senderLabel } = await import("./chat-utils");
    expect(senderLabel("customer", "admin", { counterpartName: "سارا" })).toBe(
      "سارا",
    );
    expect(senderLabel("customer", "admin")).toBe("مشتری");
    expect(senderLabel("customer", "customer")).toBe("شما");
  });
});

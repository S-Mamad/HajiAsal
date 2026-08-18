import { describe, expect, it } from "vitest";
import {
  classifyPathname,
  contextualTooltip,
  fabAriaLabel,
  resolveFabIcon,
  shouldMountSupportFab,
  ticketSubjectForContext,
} from "./context";
import {
  CART_ASSIST_COPY,
  DEFAULT_WELCOME_COPY,
  OOS_ASSIST_COPY,
  RAGE_ASSIST_COPY,
} from "./constants";
import { buildVipSummary, isHighValueAccount } from "./vip";
import { nearestSnapSide, parseSnapState } from "./snap";
import { shouldTriggerRageAssist } from "./rage";

describe("support fab context", () => {
  it("hides on auth, admin, seller, ticket threads, and checkout", () => {
    expect(shouldMountSupportFab("/login")).toBe(false);
    expect(shouldMountSupportFab("/admin/tickets")).toBe(false);
    expect(shouldMountSupportFab("/seller/dashboard")).toBe(false);
    expect(shouldMountSupportFab("/account/tickets")).toBe(false);
    expect(shouldMountSupportFab("/account/tickets/abc")).toBe(false);
    expect(shouldMountSupportFab("/checkout")).toBe(false);
    expect(shouldMountSupportFab("/cart")).toBe(true);
    expect(shouldMountSupportFab("/account")).toBe(true);
  });

  it("classifies storefront paths", () => {
    expect(classifyPathname("/product/honey")).toBe("product");
    expect(classifyPathname("/cart")).toBe("cart");
    expect(classifyPathname("/checkout")).toBe("checkout");
    expect(classifyPathname("/account/orders")).toBe("orders");
  });

  it("switches tooltip copy by page and dwell", () => {
    expect(
      contextualTooltip({
        pageKind: "home",
        productOutOfStock: false,
        rageAssist: false,
        cartDwellElapsed: false,
      }),
    ).toBe(DEFAULT_WELCOME_COPY);
    expect(
      contextualTooltip({
        pageKind: "cart",
        productOutOfStock: false,
        rageAssist: false,
        cartDwellElapsed: true,
      }),
    ).toBe(CART_ASSIST_COPY);
    expect(
      contextualTooltip({
        pageKind: "product",
        productOutOfStock: true,
        rageAssist: false,
        cartDwellElapsed: false,
      }),
    ).toBe(OOS_ASSIST_COPY);
    expect(
      contextualTooltip({
        pageKind: "home",
        productOutOfStock: false,
        rageAssist: true,
        cartDwellElapsed: false,
      }),
    ).toBe(RAGE_ASSIST_COPY);
  });

  it("keeps a stable headset icon in every status", () => {
    expect(
      resolveFabIcon({
        online: true,
        withinHours: true,
        hasShippingOrder: true,
        pageKind: "account",
      }),
    ).toBe("headset");
    expect(
      resolveFabIcon({
        online: true,
        withinHours: false,
        hasShippingOrder: false,
        pageKind: "home",
      }),
    ).toBe("headset");
    expect(
      resolveFabIcon({
        online: false,
        withinHours: true,
        hasShippingOrder: false,
        pageKind: "home",
      }),
    ).toBe("headset");
    expect(fabAriaLabel({ unread: true, online: true, withinHours: true })).toContain(
      "پیام جدید",
    );
    expect(fabAriaLabel({ unread: false, online: true, withinHours: false })).toContain(
      "پشتیبانی الان آنلاین نیست",
    );
  });

  it("builds VIP operator summary", () => {
    expect(isHighValueAccount(2_000_000)).toBe(true);
    const summary = buildVipSummary({
      fullName: "محمد",
      pageKind: "cart",
      pendingPaymentCount: 4,
      accountValue: 5_000_000,
    });
    expect(summary).toContain("محمد");
    expect(summary).toContain("سبد خرید");
    expect(summary).toContain("انتظار پرداخت");
    expect(summary).toContain("ارزش حسابش بالاست");
  });

  it("snaps to nearest edge and parses storage", () => {
    expect(nearestSnapSide(10, 400)).toBe("left");
    expect(nearestSnapSide(390, 400)).toBe("right");
    expect(parseSnapState('{"side":"left","offsetBottom":80}')).toEqual({
      side: "left",
      offsetBottom: 80,
    });
    expect(parseSnapState("nope")).toBeNull();
  });

  it("detects rage-click bursts", () => {
    expect(shouldTriggerRageAssist([1000, 1200, 1400], 1500)).toBe(true);
    expect(shouldTriggerRageAssist([1000, 1200], 1500)).toBe(false);
  });

  it("picks ticket subject from context", () => {
    expect(
      ticketSubjectForContext({
        pageKind: "product",
        productOutOfStock: true,
        hasShippingOrder: false,
      }),
    ).toBe("موجودی محصول");
  });
});

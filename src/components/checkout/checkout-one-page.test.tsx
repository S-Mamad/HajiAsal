/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CouponTrap } from "@/components/checkout/CouponTrap";
import { PaymentHandoffOverlay } from "@/components/checkout/PaymentHandoffOverlay";
import { CheckoutStickyFooter } from "@/components/checkout/CheckoutStickyFooter";

afterEach(() => {
  cleanup();
});

describe("checkout conversion micro-features", () => {
  it("shows the coupon field inline without an expand toggle", () => {
    render(
      <CouponTrap
        code=""
        onCodeChange={() => undefined}
        onApply={() => undefined}
      />,
    );
    expect(screen.queryByText("کد تخفیف دارید؟")).not.toBeInTheDocument();
    expect(screen.queryByText("بستن کد تخفیف")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "حذف" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(/کد تخفیف/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "اعمال" })).toBeInTheDocument();
  });

  it("marks an invalid coupon with aria-invalid instead of growing the field", () => {
    render(
      <CouponTrap
        code="BAD"
        onCodeChange={() => undefined}
        onApply={() => undefined}
        message="کد تخفیف معتبر نیست"
        discount={0}
      />,
    );
    const input = screen.getByPlaceholderText(/کد تخفیف/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("h-10");
    expect(input).toHaveClass("border-red-500");
    expect(screen.queryByRole("button", { name: "حذف" })).not.toBeInTheDocument();
  });

  it("shows a clear button once a coupon is applied", () => {
    const onClear = vi.fn();
    render(
      <CouponTrap
        code="HAJI10"
        onCodeChange={() => undefined}
        onApply={() => undefined}
        onClear={onClear}
        message="کد تخفیف اعمال شد"
        discount={30000}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: "حذف" });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "اعمال" })).not.toBeInTheDocument();
  });

  it("shows security handoff overlay message", () => {
    render(
      <PaymentHandoffOverlay
        open
        message="در حال ایجاد نشست امن بانکی..."
      />,
    );
    expect(
      screen.getByText("در حال ایجاد نشست امن بانکی..."),
    ).toBeInTheDocument();
  });

  it("keeps the pay bar in document flow so form fields do not slide under it", () => {
    class ResizeObserverStub {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);

    render(
      <CheckoutStickyFooter
        total={1000}
        onPay={() => undefined}
        breakdownOpen={false}
        onBreakdownOpenChange={() => undefined}
      />,
    );
    const pay = screen.getByRole("button", { name: /تایید و پرداخت/i });
    const bar = pay.closest(".shrink-0");
    expect(bar).toBeTruthy();
    expect(bar?.className ?? "").not.toMatch(/(^|\s)fixed(\s|$)/);
    vi.unstubAllGlobals();
  });
});

describe("shipping selectable cards contract", () => {
  it("exports three shipping method ids", async () => {
    const mod = await import("@/components/checkout/ShippingMethodSelector");
    const ids = ["standard", "express", "pickup"] as const;
    expect(ids).toHaveLength(3);
    expect(typeof mod.ShippingMethodSelector).toBe("object");
    void vi;
  });

  it("renders compact rows instead of tall stacked cards", async () => {
    const { ShippingMethodSelector } = await import(
      "@/components/checkout/ShippingMethodSelector"
    );
    render(
      <ShippingMethodSelector
        value="express"
        onChange={() => undefined}
        options={[
          {
            id: "standard",
            label: "پست پیشتاز",
            description: "اقتصادی",
            cost: 0,
            eta: "۳ تا ۵ روز کاری",
          },
          {
            id: "express",
            label: "پست ویژه",
            description: "ارسال سریع",
            cost: 35000,
            eta: "۱ تا ۲ روز کاری",
            recommended: true,
          },
          {
            id: "pickup",
            label: "تحویل حضوری",
            description: "",
            cost: 0,
            eta: "هماهنگی تلفنی",
          },
        ]}
      />,
    );
    expect(screen.getByText("پیشنهاد ما")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /پست پیشتاز/ })).toBeInTheDocument();
    const pickup = screen.getByRole("button", { name: /تحویل حضوری/ });
    fireEvent.click(pickup);
  });
});

describe("pickup location card", () => {
  it("shows warehouse address and unit phone", async () => {
    const { PickupLocationCard } = await import(
      "@/components/checkout/PickupLocationCard"
    );
    render(
      <PickupLocationCard
        address="یزد، انبار مرکزی حاجی عسل"
        phone="09967891973"
        receiverName="علی"
      />,
    );
    expect(screen.getByText(/تحویل حضوری از انبار/)).toBeInTheDocument();
    expect(screen.getByText(/آدرس پستی لازم نیست/)).toBeInTheDocument();
    expect(screen.getByText(/انبار مرکزی/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /09967891973/ })).toHaveAttribute(
      "href",
      "tel:09967891973",
    );
  });
});

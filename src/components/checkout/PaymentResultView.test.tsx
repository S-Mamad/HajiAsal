/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  PaymentResultView,
  paymentMethodLabel,
} from "@/components/checkout/PaymentResultView";

afterEach(() => {
  cleanup();
});

describe("PaymentResultView", () => {
  it("shows failed copy and retry/cart actions", () => {
    render(<PaymentResultView kind="failed" orderId="HA-TEST-1" />);
    expect(screen.getByText("پرداخت ناموفق بود")).toBeInTheDocument();
    expect(screen.getByText("HA-TEST-1")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "تلاش مجدد پرداخت" }),
    ).toHaveAttribute("href", expect.stringContaining("/checkout"));
    expect(screen.getByRole("link", { name: "بازگشت به سبد" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });

  it("shows cancelled and pending titles", () => {
    const { rerender } = render(<PaymentResultView kind="cancelled" />);
    expect(screen.getByText("پرداخت لغو شد")).toBeInTheDocument();
    rerender(<PaymentResultView kind="pending" />);
    expect(screen.getByText("پرداخت در حال تأیید است")).toBeInTheDocument();
  });

  it("labels zibal and snappay", () => {
    expect(paymentMethodLabel("online")).toContain("زیبال");
    expect(paymentMethodLabel("snappay")).toBe("اسنپ‌پی");
  });
});

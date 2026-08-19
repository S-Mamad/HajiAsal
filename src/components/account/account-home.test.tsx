/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OrdersStatusMatrix } from "./OrdersStatusMatrix";
import { AccountQuickLinks } from "./AccountQuickLinks";
import { ProfileHero } from "./ProfileHero";

afterEach(() => {
  cleanup();
});

describe("account home composition", () => {
  it("puts order counts in one strip, not four cards", () => {
    const { container } = render(
      <OrdersStatusMatrix
        counts={{
          active: 0,
          pendingPayment: 0,
          delivered: 0,
          cancelled: 4,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "سفارش‌ها" })).toBeInTheDocument();
    expect(screen.getByText("جاری")).toBeInTheDocument();
    expect(screen.getByText("پرداخت")).toBeInTheDocument();
    expect(screen.getByText("تحویل")).toBeInTheDocument();
    expect(screen.getByText("لغو")).toBeInTheDocument();
    expect(screen.getByLabelText("لغو شده، ۴ سفارش")).toBeInTheDocument();
    expect(screen.getByLabelText("در انتظار پرداخت، ۰ سفارش")).toBeInTheDocument();
  });

  it("keeps menu rows as a single list without order duplicate", () => {
    render(<AccountQuickLinks />);
    expect(screen.getByRole("navigation", { name: "حساب کاربری" })).toBeInTheDocument();
    expect(screen.getByText("آدرس‌ها")).toBeInTheDocument();
    expect(screen.getByText("پشتیبانی")).toBeInTheDocument();
    expect(screen.queryByText("سفارش‌ها")).not.toBeInTheDocument();
    expect(screen.queryByText("پیگیری و تاریخچه خرید")).not.toBeInTheDocument();
  });

  it("makes the profile identity a link, not a boxed card", () => {
    render(
      <ProfileHero
        displayName="سید محمد محمدی"
        initials="س م"
        phone="09351925900"
        addressSummary="تهران، خیابان ولیعصر"
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("سید محمد محمدی");
    expect(link).toHaveTextContent("09351925900");
    expect(link).toHaveTextContent("تهران، خیابان ولیعصر");
    expect(link.className).not.toMatch(/border-border/);
    expect(screen.queryByText("پروفایل")).not.toBeInTheDocument();
  });
});

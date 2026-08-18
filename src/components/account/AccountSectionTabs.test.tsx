/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { AccountSectionTabs } from "./AccountSectionTabs";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
}));

afterEach(() => {
  cleanup();
});

describe("AccountSectionTabs", () => {
  it("starts on summary and exposes switchable account tabs", () => {
    render(<AccountSectionTabs />);
    const nav = screen.getByRole("navigation", {
      name: "بخش‌های حساب کاربری",
    });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "خلاصه" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "سفارش" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پشتیبانی" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "پروفایل" })).toBeInTheDocument();
  });
});

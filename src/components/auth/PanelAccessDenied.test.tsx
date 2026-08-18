/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PanelAccessDenied } from "@/components/auth/PanelAccessDenied";

vi.mock("@/lib/auth/panel-access", () => ({
  panelSupportUrl: () => "https://hajiasal.ir/contact",
  panelHomeUrl: () => "https://hajiasal.ir",
}));

afterEach(() => {
  cleanup();
});

describe("PanelAccessDenied", () => {
  it("renders denial message and support CTA", () => {
    render(<PanelAccessDenied panelLabel="پنل مدیریت" />);
    expect(screen.getByText(/اجازه دسترسی ندارید/i)).toBeInTheDocument();
    expect(screen.getByText(/پنل مدیریت/i)).toBeInTheDocument();
    const support = screen.getByRole("link", { name: /پشتیبانی/i });
    expect(support).toHaveAttribute("href", "https://hajiasal.ir/contact");
    const home = screen.getByRole("link", { name: /بازگشت به فروشگاه/i });
    expect(home).toHaveAttribute("href", "https://hajiasal.ir");
  });
});

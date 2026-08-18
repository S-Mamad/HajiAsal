/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SellerRouteGuard } from "@/components/seller/layout/SellerRouteGuard";
import { hajiasalPath } from "@/lib/paths";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => hajiasalPath("/seller/discounts"),
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("SellerRouteGuard", () => {
  it("shows access denied instead of a stuck transferring state", () => {
    render(
      <SellerRouteGuard capabilities={{ "discounts.manage": false }}>
        <p>secret</p>
      </SellerRouteGuard>,
    );
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.queryByText(/در حال انتقال/)).not.toBeInTheDocument();
    expect(screen.getByText("دسترسی ندارید")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "بازگشت به داشبورد" }),
    ).toHaveAttribute("href", hajiasalPath("/seller/dashboard"));
  });
});

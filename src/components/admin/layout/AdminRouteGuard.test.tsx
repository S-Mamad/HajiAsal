/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminRouteGuard } from "@/components/admin/layout/AdminRouteGuard";
import { hajiasalPath } from "@/lib/paths";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => hajiasalPath("/admin/settings"),
  useRouter: () => ({ replace }),
}));

vi.mock("@/components/admin/auth/AdminAuthProvider", () => ({
  useAdminAuth: () => ({
    loading: false,
    authenticated: true,
    legacy: false,
    role: "support",
  }),
}));

vi.mock("@/lib/admin/nav", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/nav")>();
  return {
    ...actual,
    canAccessAdminPath: () => false,
    firstAllowedAdminPath: () => hajiasalPath("/admin/dashboard"),
  };
});

afterEach(() => {
  cleanup();
  replace.mockClear();
});

describe("AdminRouteGuard", () => {
  it("shows access denied instead of a stuck transferring state", () => {
    render(
      <AdminRouteGuard>
        <p>secret</p>
      </AdminRouteGuard>,
    );
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.queryByText(/در حال انتقال/)).not.toBeInTheDocument();
    expect(screen.getByText("دسترسی ندارید")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "بازگشت به داشبورد" }),
    ).toHaveAttribute("href", hajiasalPath("/admin/dashboard"));
  });
});

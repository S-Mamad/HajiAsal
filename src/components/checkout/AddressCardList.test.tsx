/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { AddressCardList } from "./AddressCardList";
import type { UserAddress } from "@/types/auth";

afterEach(() => {
  cleanup();
});

const sample: UserAddress = {
  id: "a1",
  userId: "u1",
  label: null,
  province: "اصفهان",
  city: "نجف‌آباد",
  address: "خیابان علی، پلاک ۱۲",
  postalCode: "1234567890",
  isDefault: true,
  createdAt: "2026-08-14T00:00:00.000Z",
  receiverName: "سید محمد محمدی",
  receiverPhone: "09351925900",
};

describe("AddressCardList", () => {
  it("keeps the phone next to the receiver name", () => {
    render(
      <AddressCardList
        addresses={[sample]}
        selectedId="a1"
        onSelect={() => undefined}
        onAdd={() => undefined}
      />,
    );
    const name = screen.getByText(/سید محمد محمدی/);
    expect(name.textContent).toContain("09351925900");
  });

  it("uses a single compact add-address action when the list is empty", () => {
    render(
      <AddressCardList
        addresses={[]}
        selectedId={null}
        onSelect={() => undefined}
        onAdd={() => undefined}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: /افزودن آدرس جدید/i }),
    ).toHaveLength(1);
  });

  it("keeps a saved address to two compact lines", () => {
    render(
      <AddressCardList
        addresses={[sample]}
        selectedId="a1"
        onSelect={() => undefined}
        onAdd={() => undefined}
        onDelete={() => undefined}
      />,
    );
    expect(screen.queryByText("1234567890")).not.toBeInTheDocument();
    expect(screen.queryByText("اصفهان")).not.toBeInTheDocument();
    expect(screen.queryByText("حذف")).not.toBeInTheDocument();
    expect(screen.getByLabelText("حذف آدرس")).toBeInTheDocument();
    expect(screen.getByText(/نجف‌آباد · خیابان علی، پلاک ۱۲/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /افزودن آدرس جدید/i }),
    ).toHaveLength(1);
  });
});

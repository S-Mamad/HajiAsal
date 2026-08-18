/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ShopSortMenu } from "./ShopSortMenu";
import { ShopInStockToggle } from "./ShopInStockToggle";
import { ShopLoadMoreButton } from "./ShopLoadMoreButton";

afterEach(() => {
  cleanup();
});

describe("ShopSortMenu", () => {
  it("opens a custom list and emits the chosen sort", () => {
    const onChange = vi.fn();
    render(<ShopSortMenu value="popular" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "مرتب‌سازی" }));
    fireEvent.click(screen.getByRole("option", { name: "ارزان‌ترین" }));
    expect(onChange).toHaveBeenCalledWith("price-asc");
  });
});

describe("ShopInStockToggle", () => {
  it("uses a custom checkbox instead of a native input", () => {
    const onChange = vi.fn();
    render(<ShopInStockToggle checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("checkbox", { name: "فقط موجود" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(document.querySelector('input[type="checkbox"]')).toBeNull();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("ShopLoadMoreButton", () => {
  it("renders a compact more-results action", () => {
    const onLoadMore = vi.fn();
    render(
      <ShopLoadMoreButton hasMore loading={false} onLoadMore={onLoadMore} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /مشاهده بیشتر/ }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("hides when there is no following page", () => {
    render(
      <ShopLoadMoreButton
        hasMore={false}
        loading={false}
        onLoadMore={() => undefined}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /مشاهده بیشتر/ }),
    ).not.toBeInTheDocument();
  });
});

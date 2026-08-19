/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { ShopSortMenu } from "./ShopSortMenu";
import { ShopInStockToggle } from "./ShopInStockToggle";
import { ShopLoadMoreButton } from "./ShopLoadMoreButton";
import { ShopFilterBar } from "./ShopFilterBar";

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

describe("ShopFilterBar", () => {
  it("opens dedicated sheets per filter trigger", () => {
    const updateParams = vi.fn();
    const onOpenSheet = vi.fn();
    render(
      <ShopFilterBar
        sort="popular"
        category={null}
        inStockOnly={false}
        maxPriceParam={null}
        categories={[{ id: "mountain", label: "عسل کوهستان" }]}
        onOpenSheet={onOpenSheet}
        updateParams={updateParams}
      />,
    );

    expect(screen.getByRole("toolbar", { name: "فیلترهای فروشگاه" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "مرتب‌سازی" }));
    expect(onOpenSheet).toHaveBeenCalledWith("sort");

    fireEvent.click(screen.getByRole("button", { name: "انتخاب دسته‌بندی" }));
    expect(onOpenSheet).toHaveBeenCalledWith("category");

    fireEvent.click(screen.getByRole("button", { name: "محدوده قیمت" }));
    expect(onOpenSheet).toHaveBeenCalledWith("price");
  });

  it("toggles in-stock filter immediately without opening a sheet", () => {
    const updateParams = vi.fn();
    const onOpenSheet = vi.fn();
    render(
      <ShopFilterBar
        sort="popular"
        category={null}
        inStockOnly={false}
        maxPriceParam={null}
        categories={[]}
        onOpenSheet={onOpenSheet}
        updateParams={updateParams}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "فقط موجود" }));
    expect(updateParams).toHaveBeenCalledWith({ inStock: "1" });
    expect(onOpenSheet).not.toHaveBeenCalled();
  });

  it("clears active filters from chips", () => {
    const updateParams = vi.fn();
    render(
      <ShopFilterBar
        sort="price-asc"
        category="mountain"
        inStockOnly
        maxPriceParam="250000"
        categories={[{ id: "mountain", label: "عسل کوهستان" }]}
        onOpenSheet={vi.fn()}
        updateParams={updateParams}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "حذف ارزان‌ترین" }));
    expect(updateParams).toHaveBeenCalledWith({ sort: null });

    fireEvent.click(screen.getByRole("button", { name: "حذف عسل کوهستان" }));
    expect(updateParams).toHaveBeenCalledWith({ category: null });
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

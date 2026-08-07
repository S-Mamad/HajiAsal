import { beforeEach, describe, expect, it, vi } from "vitest";

const isMysqlConfigured = vi.fn(() => false);
const mysqlExecute = vi.fn();

vi.mock("./mysql", () => ({
  isMysqlConfigured: () => isMysqlConfigured(),
  mysqlExecute: (...args: unknown[]) => mysqlExecute(...args),
}));

const updateProductAsync = vi.fn();
const getProductByIdAsync = vi.fn();

vi.mock("./products-store", () => ({
  updateProductAsync: (...args: unknown[]) => updateProductAsync(...args),
  getProductByIdAsync: (...args: unknown[]) => getProductByIdAsync(...args),
}));

import { decrementStockForPaidOrder, restoreStockForPaidOrder } from "./order-stock";
import type { CartItem } from "@/types";

describe("decrementStockForPaidOrder memory/fs path", () => {
  beforeEach(() => {
    isMysqlConfigured.mockReturnValue(false);
    updateProductAsync.mockReset();
    getProductByIdAsync.mockReset();
    updateProductAsync.mockResolvedValue({});
  });

  it("decrements when stock is sufficient", async () => {
    getProductByIdAsync.mockResolvedValue({
      id: "p1",
      title: "عسل",
      stockQty: 5,
      inStock: true,
    });
    const items: CartItem[] = [
      {
        productId: "p1",
        slug: "p1",
        title: "عسل",
        image: "",
        weight: { label: "1kg", grams: 1000, price: 100_000 },
        quantity: 2,
      },
    ];
    const shortages = await decrementStockForPaidOrder(items);
    expect(shortages).toEqual([]);
    expect(updateProductAsync).toHaveBeenCalledWith(
      "p1",
      { stockQty: 3, inStock: true },
      expect.objectContaining({ createRevision: false }),
    );
  });

  it("reports shortage and zeros stock when insufficient", async () => {
    getProductByIdAsync.mockResolvedValue({
      id: "p1",
      title: "عسل",
      stockQty: 1,
      inStock: true,
    });
    const items: CartItem[] = [
      {
        productId: "p1",
        slug: "p1",
        title: "عسل",
        image: "",
        weight: { label: "1kg", grams: 1000, price: 100_000 },
        quantity: 3,
      },
    ];
    const shortages = await decrementStockForPaidOrder(items);
    expect(shortages).toEqual(["عسل"]);
    expect(updateProductAsync).toHaveBeenCalledWith(
      "p1",
      { stockQty: 0, inStock: false },
      expect.objectContaining({ createRevision: false }),
    );
  });

  it("aggregates qty for same product lines", async () => {
    getProductByIdAsync.mockResolvedValue({
      id: "p1",
      title: "عسل",
      stockQty: 10,
      inStock: true,
    });
    const items: CartItem[] = [
      {
        productId: "p1",
        slug: "p1",
        title: "عسل",
        image: "",
        weight: { label: "500g", grams: 500, price: 50_000 },
        quantity: 2,
      },
      {
        productId: "p1",
        slug: "p1",
        title: "عسل",
        image: "",
        weight: { label: "1kg", grams: 1000, price: 100_000 },
        quantity: 3,
      },
    ];
    await decrementStockForPaidOrder(items);
    expect(updateProductAsync).toHaveBeenCalledWith(
      "p1",
      { stockQty: 5, inStock: true },
      expect.any(Object),
    );
  });

  it("restores stock after paid order", async () => {
    getProductByIdAsync.mockResolvedValue({
      id: "p1",
      title: "عسل",
      stockQty: 1,
      inStock: true,
    });
    const items: CartItem[] = [
      {
        productId: "p1",
        slug: "p1",
        title: "عسل",
        image: "",
        weight: { label: "1kg", grams: 1000, price: 100_000 },
        quantity: 2,
      },
    ];
    await restoreStockForPaidOrder(items);
    expect(updateProductAsync).toHaveBeenCalledWith(
      "p1",
      { stockQty: 3, inStock: true },
      expect.objectContaining({ createRevision: false }),
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  applyStockUpdates,
  stockDefaultsForCreate,
  syncStockFields,
} from "./product-stock-sync";

describe("syncStockFields", () => {
  it("does not invent stockQty for unlimited catalog items", () => {
    expect(syncStockFields({ inStock: true })).toEqual({ inStock: true });
    expect(syncStockFields({ inStock: true, stockQty: undefined })).toEqual({
      inStock: true,
      stockQty: undefined,
    });
  });

  it("marks out of stock when tracked qty is 0", () => {
    expect(syncStockFields({ inStock: true, stockQty: 0 })).toEqual({
      inStock: false,
      stockQty: 0,
    });
  });

  it("keeps inStock false even with positive qty when flagged", () => {
    expect(syncStockFields({ inStock: false, stockQty: 5 })).toEqual({
      inStock: false,
      stockQty: 5,
    });
  });
});

describe("applyStockUpdates", () => {
  it("sets inStock from stockQty when qty is provided", () => {
    expect(
      applyStockUpdates({ inStock: true, stockQty: 5 }, { stockQty: 0 }),
    ).toEqual({ inStock: false, stockQty: 0 });
    expect(
      applyStockUpdates({ inStock: false, stockQty: 0 }, { stockQty: 3 }),
    ).toEqual({ inStock: true, stockQty: 3 });
  });

  it("restores qty to 1 when turning inStock on from tracked zero", () => {
    expect(
      applyStockUpdates({ inStock: false, stockQty: 0 }, { inStock: true }),
    ).toEqual({ inStock: true, stockQty: 1 });
  });

  it("does not invent qty when turning inStock on for unlimited products", () => {
    expect(
      applyStockUpdates({ inStock: false }, { inStock: true }),
    ).toEqual({ inStock: true, stockQty: undefined });
  });

  it("clears tracked qty when stockQty is null", () => {
    expect(
      applyStockUpdates({ inStock: true, stockQty: 4 }, { stockQty: null }),
    ).toEqual({ inStock: true, stockQty: undefined });
  });

  it("respects explicit inStock=false with positive qty", () => {
    expect(
      applyStockUpdates(
        { inStock: true, stockQty: 4 },
        { stockQty: 4, inStock: false },
      ),
    ).toEqual({ inStock: false, stockQty: 4 });
  });
});

describe("stockDefaultsForCreate", () => {
  it("keeps unlimited when qty omitted and in stock", () => {
    expect(stockDefaultsForCreate({ inStock: true })).toEqual({
      inStock: true,
      stockQty: undefined,
    });
  });

  it("uses 0 when creating as out of stock", () => {
    expect(stockDefaultsForCreate({ inStock: false })).toEqual({
      inStock: false,
      stockQty: 0,
    });
  });
});

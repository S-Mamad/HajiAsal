import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
    getSellerProducts: vi.fn(),
    setSellerProductStock: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/server/products-store", () => ({
  getProductByIdAsync: vi.fn(),
  updateProductAsync: vi.fn(async (id: string, patch: unknown) => ({
    id,
    ...(patch as object),
  })),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/seller-notifications", () => ({
  createSellerNotification: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/seller/inventory/route";
import {
  getSellerFromRequest,
  getSellerProducts,
} from "@/lib/server/sellers";
import {
  getProductByIdAsync,
  updateProductAsync,
} from "@/lib/server/products-store";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

const ownProduct = {
  id: "p1",
  sellerId: "s1",
  title: "عسل",
  stockQty: 10,
  inStock: true,
  weightOptions: [{ label: "1kg", grams: 1000, price: 100000 }],
};

describe("seller inventory behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1" });
    vi.mocked(getSellerProducts).mockResolvedValue([ownProduct as never]);
  });

  it("GET lists inventory for seller products", async () => {
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/inventory"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(Array.isArray(json.products)).toBe(true);
    expect(getSellerProducts).toHaveBeenCalledWith("s1");
  });

  it("PATCH updates own product stock", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue(ownProduct as never);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p1", delta: -2 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateProductAsync).toHaveBeenCalled();
  });

  it("PATCH rejects other seller product", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      ...ownProduct,
      sellerId: "s2",
    } as never);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p1", delta: 1 }),
      }),
    );
    expect(res.status).toBe(404);
    expect(updateProductAsync).not.toHaveBeenCalled();
  });

  it("denied without inventory.manage", async () => {
    sellerMock.asSellerWithout("inventory.manage");
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/inventory"),
    );
    expect(res.status).toBe(403);
  });
});

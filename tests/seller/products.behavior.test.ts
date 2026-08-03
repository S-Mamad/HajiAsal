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
  };
});

vi.mock("@/lib/server/products-store", () => ({
  createProductAsync: vi.fn(),
  getProductByIdAsync: vi.fn(),
  updateProductAsync: vi.fn(),
  deleteProductAsync: vi.fn(),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/seller/products/route";
import {
  getSellerFromRequest,
  getSellerProducts,
} from "@/lib/server/sellers";
import {
  createProductAsync,
  getProductByIdAsync,
  updateProductAsync,
  deleteProductAsync,
} from "@/lib/server/products-store";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

const ownProduct = {
  id: "p-own",
  sellerId: "s1",
  title: "عسل خودم",
  slug: "honey-own",
  shortDescription: "",
  longDescription: "",
  category: "honey",
  categoryLabel: "عسل",
  images: [],
  weightOptions: [{ label: "1kg", grams: 1000, price: 100_000 }],
  inStock: true,
  stockQty: 5,
  rating: 0,
  reviewCount: 0,
  createdAt: new Date().toISOString(),
  approvalStatus: "approved" as const,
};

describe("seller products behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1" });
    vi.mocked(getSellerProducts).mockResolvedValue([ownProduct as never]);
  });

  it("GET lists only seller products", async () => {
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/products"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(Array.isArray(json.products)).toBe(true);
    expect(getSellerProducts).toHaveBeenCalledWith("s1");
  });

  it("GET by id returns 404 for unknown product", async () => {
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/products?id=other"),
    );
    expect(res.status).toBe(404);
  });

  it("POST creates product with pending approval", async () => {
    vi.mocked(createProductAsync).mockImplementation(async (p) => p as never);
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "عسل جدید",
          category: "honey",
          weightOptions: [{ label: "1kg", grams: 1000, price: 120000 }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.success).toBe(true);
    const created = json.product as { approvalStatus: string; sellerId: string };
    expect(created.approvalStatus).toBe("pending");
    expect(created.sellerId).toBe("s1");
  });

  it("POST duplicate rejects other seller product", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      ...ownProduct,
      id: "p-other",
      sellerId: "s2",
    } as never);
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicate",
          productId: "p-other",
          title: "کپی محصول",
          category: "honey",
          weightOptions: [{ label: "1kg", grams: 1000, price: 1 }],
        }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("PATCH rejects product owned by another seller", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      ...ownProduct,
      sellerId: "s2",
    } as never);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p-own", title: "هک شده" }),
      }),
    );
    expect(res.status).toBe(404);
    expect(updateProductAsync).not.toHaveBeenCalled();
  });

  it("DELETE skips product owned by another seller", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      ...ownProduct,
      sellerId: "s2",
    } as never);
    const res = await DELETE(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p-own" }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.deleted).toBe(0);
    expect(deleteProductAsync).not.toHaveBeenCalled();
  });

  it("POST invalid body returns 400", async () => {
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "x" }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

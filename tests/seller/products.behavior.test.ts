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
  softDeleteProductAsync: vi.fn(),
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
  softDeleteProductAsync,
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
  category: "specialty",
  categoryLabel: "ویژه",
  images: [] as string[],
  weightOptions: [{ label: "1kg", grams: 1000, price: 100_000 }],
  inStock: true,
  stockQty: 5,
  rating: 0,
  reviewCount: 0,
  createdAt: new Date().toISOString(),
  approvalStatus: "approved" as const,
  submittedAt: "2026-01-01T00:00:00.000Z",
  status: "active" as const,
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
          category: "specialty",
          weightOptions: [{ label: "1kg", grams: 1000, price: 120000 }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.success).toBe(true);
    const created = json.product as {
      approvalStatus: string;
      sellerId: string;
      status: string;
      submittedAt?: string;
    };
    expect(created.approvalStatus).toBe("pending");
    expect(created.sellerId).toBe("s1");
    expect(created.status).toBe("draft");
    expect(created.submittedAt).toBeTruthy();
  });

  it("POST draft stays local until submitted", async () => {
    vi.mocked(createProductAsync).mockImplementation(async (p) => p as never);
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "پیش‌نویس عسل",
          category: "specialty",
          status: "draft",
          weightOptions: [{ label: "1kg", grams: 1000, price: 120000 }],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    const created = json.product as {
      status: string;
      submittedAt?: string;
      approvalStatus: string;
    };
    expect(created.status).toBe("draft");
    expect(created.approvalStatus).toBe("pending");
    expect(created.submittedAt).toBeFalsy();
  });

  it("PATCH blocks activating unapproved product", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      ...ownProduct,
      approvalStatus: "pending",
    } as never);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p-own", status: "active" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(updateProductAsync).not.toHaveBeenCalled();
  });

  it("PATCH does not re-queue when content is unchanged", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue(ownProduct as never);
    vi.mocked(updateProductAsync).mockImplementation(
      async (_id, updates) => ({ ...ownProduct, ...updates }) as never,
    );
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "p-own",
          title: ownProduct.title,
          shortDescription: ownProduct.shortDescription,
          longDescription: ownProduct.longDescription,
          category: ownProduct.category,
          images: ownProduct.images,
          weightOptions: ownProduct.weightOptions,
          stockQty: ownProduct.stockQty,
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateProductAsync).toHaveBeenCalled();
    const patch = vi.mocked(updateProductAsync).mock.calls[0]?.[1] as {
      approvalStatus?: string;
      status?: string;
    };
    expect(patch.approvalStatus).toBeUndefined();
    expect(patch.status).toBeUndefined();
  });

  it("PATCH re-queues when content actually changes", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue(ownProduct as never);
    vi.mocked(updateProductAsync).mockImplementation(
      async (_id, updates) => ({ ...ownProduct, ...updates }) as never,
    );
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: "p-own",
          title: "عنوان جدید",
          shortDescription: ownProduct.shortDescription,
          category: ownProduct.category,
          images: ownProduct.images,
          weightOptions: ownProduct.weightOptions,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const patch = vi.mocked(updateProductAsync).mock.calls[0]?.[1] as {
      approvalStatus?: string;
      status?: string;
      submittedAt?: string;
    };
    expect(patch.approvalStatus).toBe("pending");
    expect(patch.status).toBe("draft");
    expect(patch.submittedAt).toBeTruthy();
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
        }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("POST duplicate works with only action and productId", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue(ownProduct as never);
    vi.mocked(createProductAsync).mockImplementation(async (p) => p as never);
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "duplicate",
          productId: "p-own",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    const created = json.product as {
      title: string;
      status: string;
      submittedAt?: string;
      sellerId: string;
    };
    expect(created.title).toContain("کپی");
    expect(created.status).toBe("draft");
    expect(created.submittedAt).toBeFalsy();
    expect(created.sellerId).toBe("s1");
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
    expect(softDeleteProductAsync).not.toHaveBeenCalled();
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

  it("POST rejects unknown category", async () => {
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "عسل بد دسته",
          category: "honey",
          weightOptions: [{ label: "1kg", grams: 1000, price: 120000 }],
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("PATCH blocks soft-deleted products", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      ...ownProduct,
      deletedAt: "2026-01-02T00:00:00.000Z",
    } as never);
    const res = await PATCH(
      authedSellerRequest("http://localhost/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: "p-own", title: "تغییر" }),
      }),
    );
    expect(res.status).toBe(410);
    expect(updateProductAsync).not.toHaveBeenCalled();
  });
});

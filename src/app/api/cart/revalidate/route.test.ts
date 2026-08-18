import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/products-store", () => ({
  getProductByIdAsync: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  getEffectiveWeightPrice: vi.fn(
    (_product: unknown, weight: { price: number }) => weight.price,
  ),
}));

vi.mock("@/lib/product-availability", () => ({
  isProductPurchasable: vi.fn((p: { inStock?: boolean }) => p.inStock !== false),
}));

import { getProductByIdAsync } from "@/lib/server/products-store";
import { POST } from "@/app/api/cart/revalidate/route";

describe("POST /api/cart/revalidate", () => {
  beforeEach(() => {
    vi.mocked(getProductByIdAsync).mockReset();
  });

  it("marks out of stock items", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      title: "عسل",
      images: ["/a.jpg"],
      inStock: false,
      stockQty: 0,
      weightOptions: [{ label: "1kg", grams: 1000, price: 100000 }],
    } as never);

    const res = await POST(
      new Request("http://localhost/api/cart/revalidate", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: "p1",
              weightGrams: 1000,
              quantity: 1,
              currentPrice: 100000,
            },
          ],
        }),
      }),
    );
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.items[0].availability).toBe("out_of_stock");
  });

  it("detects price changes", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      title: "عسل",
      images: ["/a.jpg"],
      inStock: true,
      stockQty: 5,
      weightOptions: [{ label: "1kg", grams: 1000, price: 120000 }],
    } as never);

    const res = await POST(
      new Request("http://localhost/api/cart/revalidate", {
        method: "POST",
        body: JSON.stringify({
          items: [
            {
              productId: "p1",
              weightGrams: 1000,
              quantity: 1,
              currentPrice: 100000,
            },
          ],
        }),
      }),
    );
    const data = await res.json();
    expect(data.items[0].availability).toBe("price_changed");
    expect(data.items[0].livePrice).toBe(120000);
    expect(data.items[0].imageFit).toBeNull();
  });

  it("returns the live image crop and null after reset", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      title: "عسل",
      images: ["/a.webp"],
      imageFits: { "/a.webp": { scale: 1.6, x: 8, y: -4 } },
      inStock: true,
      stockQty: 5,
      weightOptions: [{ label: "1kg", grams: 1000, price: 100000 }],
    } as never);

    const withFit = await POST(
      new Request("http://localhost/api/cart/revalidate", {
        method: "POST",
        body: JSON.stringify({
          items: [{ productId: "p1", weightGrams: 1000, quantity: 1 }],
        }),
      }),
    );
    expect((await withFit.json()).items[0].imageFit).toEqual({
      scale: 1.6,
      x: 8,
      y: -4,
    });

    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      title: "عسل",
      images: ["/a.webp"],
      inStock: true,
      stockQty: 5,
      weightOptions: [{ label: "1kg", grams: 1000, price: 100000 }],
    } as never);

    const reset = await POST(
      new Request("http://localhost/api/cart/revalidate", {
        method: "POST",
        body: JSON.stringify({
          items: [{ productId: "p1", weightGrams: 1000, quantity: 1 }],
        }),
      }),
    );
    expect((await reset.json()).items[0].imageFit).toBeNull();
  });
});

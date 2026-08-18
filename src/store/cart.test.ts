import { beforeEach, describe, expect, it } from "vitest";

const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
  },
  configurable: true,
});

const { useCartStore } = await import("@/store/cart");

describe("cart store", () => {
  beforeEach(() => {
    memory.clear();
    useCartStore.setState({
      items: [],
      appliedCouponCode: null,
      isOpen: false,
      announcement: "",
    });
  });

  it("adds and merges same product+weight", () => {
    const item = {
      productId: "p1",
      slug: "honey",
      title: "عسل",
      image: "/x.webp",
      weight: { label: "۵۰۰ گرم", grams: 500, price: 400_000 },
    };
    useCartStore.getState().addItem(item, 1);
    useCartStore.getState().addItem(item, 2);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
    expect(useCartStore.getState().getSubtotal()).toBe(1_200_000);
  });

  it("clearCart also clears coupon", () => {
    useCartStore.setState({
      items: [
        {
          productId: "p1",
          slug: "honey",
          title: "عسل",
          image: "/x.webp",
          weight: { label: "۵۰۰ گرم", grams: 500, price: 400_000 },
          quantity: 1,
        },
      ],
      appliedCouponCode: "HAJI10",
    });
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().appliedCouponCode).toBeNull();
  });

  it("updateQuantity to 0 removes item", () => {
    useCartStore.getState().addItem(
      {
        productId: "p1",
        slug: "honey",
        title: "عسل",
        image: "/x.webp",
        weight: { label: "۵۰۰ گرم", grams: 500, price: 400_000 },
      },
      2,
    );
    useCartStore.getState().updateQuantity("p1", 500, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("rejects out-of-stock products", () => {
    const ok = useCartStore.getState().addItem(
      {
        productId: "p-oos",
        slug: "oos",
        title: "ناموجود",
        image: "/x.webp",
        weight: { label: "۵۰۰ گرم", grams: 500, price: 100_000 },
        inStock: false,
        stockQty: 0,
      },
      1,
    );
    expect(ok).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().announcement).toContain("ناموجود");
  });

  it("caps quantity by stockQty", () => {
    const item = {
      productId: "p2",
      slug: "honey2",
      title: "عسل محدود",
      image: "/x.webp",
      weight: { label: "۵۰۰ گرم", grams: 500, price: 100_000 },
      inStock: true,
      stockQty: 2,
    };
    expect(useCartStore.getState().addItem(item, 2)).toBe(true);
    expect(useCartStore.getState().addItem(item, 1)).toBe(false);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it("aggregates stock across weight variants of the same product", () => {
    const base = {
      productId: "p-multi",
      slug: "honey-multi",
      title: "عسل چندوزنی",
      image: "/x.webp",
      inStock: true,
      stockQty: 2,
    };
    expect(
      useCartStore.getState().addItem(
        {
          ...base,
          weight: { label: "۵۰۰ گرم", grams: 500, price: 100_000 },
        },
        2,
      ),
    ).toBe(true);
    expect(
      useCartStore.getState().addItem(
        {
          ...base,
          weight: { label: "۱ کیلو", grams: 1000, price: 180_000 },
        },
        1,
      ),
    ).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it("cart total excludes shipping until checkout", () => {
    useCartStore.setState({
      shippingConfig: {
        shippingCost: 55_000,
        freeShippingThreshold: 0,
      },
    });
    useCartStore.getState().addItem(
      {
        productId: "p-ship",
        slug: "honey-ship",
        title: "عسل",
        image: "/x.webp",
        weight: { label: "۵۰۰ گرم", grams: 500, price: 100_000 },
      },
      1,
    );
    expect(useCartStore.getState().getPayableSubtotal()).toBe(100_000);
    expect(useCartStore.getState().getTotal()).toBe(100_000);
    expect(useCartStore.getState().getShippingCost()).toBe(55_000);
  });

  it("clamps quantity when revalidate reports lower stock", () => {
    useCartStore.getState().addItem(
      {
        productId: "p-clamp",
        slug: "honey-clamp",
        title: "عسل",
        image: "/x.webp",
        weight: { label: "۵۰۰ گرم", grams: 500, price: 100_000 },
        inStock: true,
        stockQty: 5,
      },
      5,
    );
    useCartStore.getState().applyRevalidate([
      {
        productId: "p-clamp",
        weightGrams: 500,
        availability: "ok",
        inStock: true,
        stockQty: 2,
        livePrice: 100_000,
      },
    ]);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it("clears a stored crop when revalidate reports null imageFit", () => {
    useCartStore.getState().addItem(
      {
        productId: "p-fit",
        slug: "honey-fit",
        title: "عسل",
        image: "/x.webp",
        imageFit: { scale: 1.8, x: 10, y: -6 },
        weight: { label: "۵۰۰ گرم", grams: 500, price: 100_000 },
        inStock: true,
        stockQty: 5,
      },
      1,
    );
    useCartStore.getState().applyRevalidate([
      {
        productId: "p-fit",
        weightGrams: 500,
        availability: "ok",
        inStock: true,
        stockQty: 5,
        livePrice: 100_000,
        imageFit: null,
      },
    ]);
    expect(useCartStore.getState().items[0]?.imageFit).toBeUndefined();
  });
});

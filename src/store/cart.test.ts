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
});

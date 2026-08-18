"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, CartItemAvailability, WeightOption } from "@/types";
import type { ProductImageFit } from "@/lib/product-image";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import {
  CART_MAX_QTY,
  isProductPurchasable,
  maxPurchasableQty,
} from "@/lib/product-availability";

const defaultSite = site as SiteConfig;

interface ShippingConfig {
  shippingCost: number;
  freeShippingThreshold: number;
}

type AddItemInput = Omit<CartItem, "quantity">;

interface CartRevalidatePatch {
  productId: string;
  weightGrams: number;
  availability: CartItemAvailability;
  inStock: boolean;
  stockQty?: number;
  livePrice: number;
  title?: string;
  image?: string;
  imageFit?: ProductImageFit | null;
  sellerId?: string;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  announcement: string;
  appliedCouponCode: string | null;
  shippingConfig: ShippingConfig;
  lastInteractedAt: number | null;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setShippingConfig: (config: Partial<ShippingConfig>) => void;
  setAppliedCouponCode: (code: string | null) => void;
  setAnnouncement: (message: string) => void;
  clearAnnouncement: () => void;
  touchInteraction: () => void;
  addItem: (item: AddItemInput, quantity?: number) => boolean;
  removeItem: (productId: string, weightGrams: number) => void;
  updateQuantity: (
    productId: string,
    weightGrams: number,
    quantity: number,
  ) => void;
  applyRevalidate: (patches: CartRevalidatePatch[]) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getSubtotal: () => number;
  getPayableSubtotal: () => number;
  getItemCount: () => number;
  getShippingCost: () => number;
  getFreeShippingProgress: () => {
    threshold: number;
    remaining: number;
    progress: number;
    qualified: boolean;
  };
  getTotal: () => number;
}

function stockSnapshot(item: AddItemInput | CartItem) {
  return {
    inStock: item.inStock !== false,
    stockQty: item.stockQty,
  };
}

/** Qty already in cart for a product across all weight lines. */
function qtyForProduct(
  items: CartItem[],
  productId: string,
  exceptWeightGrams?: number,
): number {
  return items.reduce((sum, i) => {
    if (i.productId !== productId) return sum;
    if (
      typeof exceptWeightGrams === "number" &&
      i.weight.grams === exceptWeightGrams
    ) {
      return sum;
    }
    return sum + i.quantity;
  }, 0);
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      announcement: "",
      appliedCouponCode: null,
      shippingConfig: {
        shippingCost: defaultSite.shippingCost,
        freeShippingThreshold: defaultSite.freeShippingThreshold ?? 0,
      },
      lastInteractedAt: null,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setShippingConfig: (config) =>
        set((state) => ({
          shippingConfig: { ...state.shippingConfig, ...config },
        })),
      setAppliedCouponCode: (code) => set({ appliedCouponCode: code }),
      setAnnouncement: (message) => set({ announcement: message }),
      clearAnnouncement: () => set({ announcement: "" }),
      touchInteraction: () => set({ lastInteractedAt: Date.now() }),

      addItem: (item, quantity = 1) => {
        const stock = stockSnapshot(item);
        if (!isProductPurchasable(stock) || item.inStock === false) {
          set({
            announcement: `محصول «${item.title}» ناموجود است و به سبد اضافه نشد`,
          });
          return false;
        }

        const maxQty = maxPurchasableQty(stock);
        const existing = get().items.find(
          (i) =>
            i.productId === item.productId &&
            i.weight.grams === item.weight.grams,
        );
        const currentQty = existing?.quantity ?? 0;
        const otherWeightsQty = qtyForProduct(
          get().items,
          item.productId,
          item.weight.grams,
        );
        const room = Math.max(0, maxQty - otherWeightsQty);
        const nextQty = Math.min(currentQty + quantity, room);

        if (nextQty <= currentQty) {
          set({
            announcement:
              maxQty <= 0
                ? `محصول «${item.title}» ناموجود است`
                : `موجودی «${item.title}» کافی نیست (حداکثر ${maxQty})`,
          });
          return false;
        }

        set((state) => {
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId &&
                i.weight.grams === item.weight.grams
                  ? {
                      ...i,
                      quantity: nextQty,
                      inStock: true,
                      stockQty: item.stockQty ?? i.stockQty,
                      availability: "ok",
                      image: item.image,
                      imageFit: item.imageFit,
                      weight: {
                        ...i.weight,
                        price: item.weight.price,
                      },
                    }
                  : i,
              ),
              isOpen: false,
              lastInteractedAt: Date.now(),
              announcement: `تعداد ${item.title} در سبد به‌روزرسانی شد`,
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...item,
                quantity: nextQty,
                inStock: true,
                stockQty: item.stockQty,
                priceAtAdd: item.priceAtAdd ?? item.weight.price,
                availability: "ok",
              },
            ],
            isOpen: false,
            lastInteractedAt: Date.now(),
            announcement: `${item.title} به سبد خرید اضافه شد`,
          };
        });
        return true;
      },

      removeItem: (productId, weightGrams) => {
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(
                i.productId === productId && i.weight.grams === weightGrams
              ),
          ),
          lastInteractedAt: Date.now(),
        }));
      },

      updateQuantity: (productId, weightGrams, quantity) => {
        if (quantity < 1) {
          get().removeItem(productId, weightGrams);
          return;
        }
        set((state) => {
          const target = state.items.find(
            (i) =>
              i.productId === productId && i.weight.grams === weightGrams,
          );
          if (!target) return state;

          if (target.inStock === false || target.availability === "out_of_stock") {
            return {
              announcement: `محصول «${target.title}» ناموجود است`,
            };
          }

          const maxQty = maxPurchasableQty({
            inStock: true,
            stockQty: target.stockQty,
          });

          if (maxQty <= 0 && typeof target.stockQty === "number") {
            return {
              announcement: `محصول «${target.title}» ناموجود است`,
            };
          }

          const otherWeightsQty = qtyForProduct(
            state.items,
            productId,
            weightGrams,
          );
          const room =
            typeof target.stockQty === "number"
              ? Math.max(0, maxQty - otherWeightsQty)
              : CART_MAX_QTY;
          const capped = Math.min(quantity, room);

          if (capped < quantity) {
            return {
              items: state.items.map((i) =>
                i.productId === productId && i.weight.grams === weightGrams
                  ? { ...i, quantity: capped }
                  : i,
              ),
              lastInteractedAt: Date.now(),
              announcement: `موجودی «${target.title}» کافی نیست (حداکثر ${capped})`,
            };
          }

          return {
            items: state.items.map((i) =>
              i.productId === productId && i.weight.grams === weightGrams
                ? { ...i, quantity: capped }
                : i,
            ),
            lastInteractedAt: Date.now(),
          };
        });
      },

      applyRevalidate: (patches) => {
        set((state) => ({
          items: state.items.map((item) => {
            const patch = patches.find(
              (p) =>
                p.productId === item.productId &&
                p.weightGrams === item.weight.grams,
            );
            if (!patch) return item;
            const priceAtAdd = item.priceAtAdd ?? item.weight.price;
            const quantity =
              typeof patch.stockQty === "number"
                ? Math.min(item.quantity, Math.max(0, patch.stockQty))
                : item.quantity;
            return {
              ...item,
              title: patch.title ?? item.title,
              image: patch.image ?? item.image,
              imageFit:
                patch.imageFit === undefined
                  ? item.imageFit
                  : (patch.imageFit ?? undefined),
              sellerId: patch.sellerId ?? item.sellerId,
              inStock: patch.inStock,
              stockQty: patch.stockQty,
              availability: patch.availability,
              quantity,
              priceAtAdd,
              weight: {
                ...item.weight,
                price: patch.livePrice,
              },
            };
          }),
        }));
      },

      clearCart: () =>
        set({ items: [], appliedCouponCode: null, lastInteractedAt: Date.now() }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getSubtotal: () =>
        get().items.reduce(
          (sum, item) => sum + item.weight.price * item.quantity,
          0,
        ),

      getPayableSubtotal: () =>
        get().items.reduce((sum, item) => {
          if (item.availability === "out_of_stock" || item.inStock === false) {
            return sum;
          }
          return sum + item.weight.price * item.quantity;
        }, 0),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getShippingCost: () => {
        const subtotal = get().getPayableSubtotal();
        if (subtotal === 0) return 0;
        const { shippingCost, freeShippingThreshold } = get().shippingConfig;
        if (freeShippingThreshold > 0 && subtotal >= freeShippingThreshold) {
          return 0;
        }
        return shippingCost;
      },

      getFreeShippingProgress: () => {
        const threshold = get().shippingConfig.freeShippingThreshold;
        const subtotal = get().getPayableSubtotal();
        if (threshold <= 0) {
          return { threshold: 0, remaining: 0, progress: 0, qualified: false };
        }
        const remaining = Math.max(0, threshold - subtotal);
        const progress = Math.min(1, subtotal / threshold);
        return {
          threshold,
          remaining,
          progress,
          qualified: remaining === 0,
        };
      },

      getTotal: () => get().getPayableSubtotal(),
    }),
    {
      name: "haji-asal-cart",
      version: 2,
      partialize: (state) => ({
        items: state.items,
        appliedCouponCode: state.appliedCouponCode,
        lastInteractedAt: state.lastInteractedAt,
      }),
      migrate: (persisted) => {
        const state = persisted as {
          items?: CartItem[];
          appliedCouponCode?: string | null;
          lastInteractedAt?: number | null;
          shippingConfig?: unknown;
        };
        delete state.shippingConfig;
        return {
          items: state.items ?? [],
          appliedCouponCode: state.appliedCouponCode ?? null,
          lastInteractedAt: state.lastInteractedAt ?? null,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        useCartStore.setState({ _hasHydrated: true });
        if (error) {
          console.warn("[cart] persist rehydrate failed", error);
        }
      },
    },
  ),
);

export type { WeightOption, CartRevalidatePatch };

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, WeightOption } from "@/types";
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
}

type AddItemInput = Omit<CartItem, "quantity">;

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  announcement: string;
  appliedCouponCode: string | null;
  shippingConfig: ShippingConfig;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setShippingConfig: (config: ShippingConfig) => void;
  setAppliedCouponCode: (code: string | null) => void;
  setAnnouncement: (message: string) => void;
  clearAnnouncement: () => void;
  addItem: (item: AddItemInput, quantity?: number) => boolean;
  removeItem: (productId: string, weightGrams: number) => void;
  updateQuantity: (
    productId: string,
    weightGrams: number,
    quantity: number,
  ) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
  getShippingCost: () => number;
  getTotal: () => number;
}

function stockSnapshot(item: AddItemInput | CartItem) {
  return {
    inStock: item.inStock !== false,
    stockQty: item.stockQty,
  };
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
      },
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setShippingConfig: (config) => set({ shippingConfig: config }),
      setAppliedCouponCode: (code) => set({ appliedCouponCode: code }),
      setAnnouncement: (message) => set({ announcement: message }),
      clearAnnouncement: () => set({ announcement: "" }),

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
        const nextQty = Math.min(currentQty + quantity, maxQty);

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
                    }
                  : i,
              ),
              isOpen: false,
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
              },
            ],
            isOpen: false,
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

          if (target.inStock === false) {
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

          const capped = Math.min(
            quantity,
            typeof target.stockQty === "number" ? maxQty : CART_MAX_QTY,
          );

          if (capped < quantity) {
            return {
              items: state.items.map((i) =>
                i.productId === productId && i.weight.grams === weightGrams
                  ? { ...i, quantity: capped }
                  : i,
              ),
              announcement: `موجودی «${target.title}» کافی نیست (حداکثر ${capped})`,
            };
          }

          return {
            items: state.items.map((i) =>
              i.productId === productId && i.weight.grams === weightGrams
                ? { ...i, quantity: capped }
                : i,
            ),
          };
        });
      },

      clearCart: () => set({ items: [], appliedCouponCode: null }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getSubtotal: () =>
        get().items.reduce(
          (sum, item) => sum + item.weight.price * item.quantity,
          0,
        ),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      getShippingCost: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        return get().shippingConfig.shippingCost;
      },

      getTotal: () => get().getSubtotal() + get().getShippingCost(),
    }),
    {
      name: "haji-asal-cart",
      partialize: (state) => ({
        items: state.items,
        appliedCouponCode: state.appliedCouponCode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export type { WeightOption };

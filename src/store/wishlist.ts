"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  ids: string[];
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  clear: () => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (productId) => {
        set((state) => ({
          ids: state.ids.includes(productId)
            ? state.ids.filter((id) => id !== productId)
            : [...state.ids, productId],
        }));
      },
      has: (productId) => get().ids.includes(productId),
      clear: () => set({ ids: [] }),
      count: () => get().ids.length,
    }),
    { name: "haji-asal-wishlist" },
  ),
);

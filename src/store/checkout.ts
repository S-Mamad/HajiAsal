"use client";

import { create } from "zustand";
import type { ShippingMethod } from "@/components/checkout/ShippingMethodSelector";
import type { UserAddress } from "@/types/auth";

export type CheckoutAddressSnapshot = Pick<
  UserAddress,
  | "id"
  | "province"
  | "city"
  | "address"
  | "postalCode"
  | "receiverName"
  | "receiverPhone"
> | null;

interface CheckoutStore {
  shippingMethod: ShippingMethod | null;
  address: CheckoutAddressSnapshot;
  isProcessing: boolean;
  setShippingMethod: (method: ShippingMethod | null) => void;
  setAddress: (address: CheckoutAddressSnapshot) => void;
  setIsProcessing: (value: boolean) => void;
  resetCheckoutUi: () => void;
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  shippingMethod: null,
  address: null,
  isProcessing: false,
  setShippingMethod: (shippingMethod) => set({ shippingMethod }),
  setAddress: (address) => set({ address }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  resetCheckoutUi: () =>
    set({
      shippingMethod: null,
      address: null,
      isProcessing: false,
    }),
}));

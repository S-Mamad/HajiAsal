import { beforeEach, describe, expect, it } from "vitest";
import { useCheckoutStore } from "@/store/checkout";

describe("checkout zustand store", () => {
  beforeEach(() => {
    useCheckoutStore.getState().resetCheckoutUi();
  });

  it("holds only shippingMethod, address, isProcessing", () => {
    const state = useCheckoutStore.getState();
    expect(state.shippingMethod).toBeNull();
    expect(state.address).toBeNull();
    expect(state.isProcessing).toBe(false);
  });

  it("updates shipping method for live total recalculation", () => {
    useCheckoutStore.getState().setShippingMethod("express");
    expect(useCheckoutStore.getState().shippingMethod).toBe("express");
  });

  it("locks UI via isProcessing handoff flag", () => {
    useCheckoutStore.getState().setIsProcessing(true);
    expect(useCheckoutStore.getState().isProcessing).toBe(true);
    useCheckoutStore.getState().setIsProcessing(false);
    expect(useCheckoutStore.getState().isProcessing).toBe(false);
  });

  it("stores selected address snapshot", () => {
    useCheckoutStore.getState().setAddress({
      id: "addr_1",
      province: "یزد",
      city: "یزد",
      address: "بلوار کارگر",
      postalCode: "8912345678",
      receiverName: "علی",
      receiverPhone: "09967891973",
    });
    expect(useCheckoutStore.getState().address?.id).toBe("addr_1");
  });
});

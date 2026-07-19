export type DiscountCoupon = {
  type: "percent" | "fixed";
  value: number;
  maxDiscount?: number;
};

/** Payable total — never negative even if fixed discount exceeds cart. */
export function computeOrderTotal(
  subtotal: number,
  shipping: number,
  discount: number,
): number {
  return Math.max(0, subtotal + shipping - Math.max(0, discount));
}

export function computeDiscountAmount(
  coupon: DiscountCoupon,
  subtotal: number,
): number {
  if (coupon.type === "percent") {
    let discount = Math.floor((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    return discount;
  }
  return Math.min(coupon.value, Math.max(0, subtotal));
}

import type { RowDataPacket } from "mysql2/promise";
import couponsData from "@/data/coupons.json";
import { isMysqlConfigured, mysqlQuery, toBool } from "./mysql";

export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  label: string;
}

const staticCoupons = couponsData as Coupon[];

function mapCouponRow(row: Record<string, unknown>): Coupon {
  return {
    code: row.code as string,
    type: row.type as "percent" | "fixed",
    value: Number(row.value),
    minOrder: Number(row.min_order),
    maxDiscount: row.max_discount ? Number(row.max_discount) : undefined,
    active: toBool(row.active),
    label: (row.label as string) ?? row.code as string,
  };
}

export async function getAllCouponsAsync(): Promise<Coupon[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>("SELECT * FROM coupons");
      if (rows.length) return rows.map(mapCouponRow);
    } catch (error) {
      console.error(
        "[coupons] fetch failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  return staticCoupons;
}

function computeDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === "percent") {
    let discount = Math.floor((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    return discount;
  }
  return coupon.value;
}

export async function validateCouponAsync(
  code: string,
  subtotal: number,
): Promise<{
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  message: string;
}> {
  const normalized = code.trim().toUpperCase();
  const coupons = await getAllCouponsAsync();
  const coupon = coupons.find(
    (c) => c.code.toUpperCase() === normalized && c.active,
  );

  if (!coupon) {
    return { valid: false, discount: 0, message: "کد تخفیف نامعتبر است" };
  }

  if (subtotal < coupon.minOrder) {
    return {
      valid: false,
      discount: 0,
      message: `حداقل مبلغ سفارش ${coupon.minOrder.toLocaleString("fa-IR")} تومان است`,
    };
  }

  const discount = computeDiscount(coupon, subtotal);
  return {
    valid: true,
    coupon,
    discount,
    message: coupon.label,
  };
}

export function validateCoupon(
  code: string,
  subtotal: number,
): {
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  message: string;
} {
  const normalized = code.trim().toUpperCase();
  const coupon = staticCoupons.find(
    (c) => c.code.toUpperCase() === normalized && c.active,
  );

  if (!coupon) {
    return { valid: false, discount: 0, message: "کد تخفیف نامعتبر است" };
  }

  if (subtotal < coupon.minOrder) {
    return {
      valid: false,
      discount: 0,
      message: `حداقل مبلغ سفارش ${coupon.minOrder.toLocaleString("fa-IR")} تومان است`,
    };
  }

  return {
    valid: true,
    coupon,
    discount: computeDiscount(coupon, subtotal),
    message: coupon.label,
  };
}

export async function getActiveCouponsAsync(): Promise<Coupon[]> {
  const coupons = await getAllCouponsAsync();
  return coupons.filter((c) => c.active);
}

export function getActiveCoupons(): Coupon[] {
  return staticCoupons.filter((c) => c.active);
}

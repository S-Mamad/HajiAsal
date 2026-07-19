import type { RowDataPacket } from "mysql2/promise";
import couponsData from "@/data/coupons.json";
import { isMysqlConfigured, mysqlExecute, mysqlQuery, toBool, toIso } from "./mysql";
import { computeDiscountAmount } from "@/lib/commerce/money";

export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  active: boolean;
  label: string;
  sellerId?: string;
}

export { computeDiscountAmount } from "@/lib/commerce/money";

const staticCoupons = couponsData as Coupon[];

function mapCouponRow(row: Record<string, unknown>): Coupon {
  return {
    code: row.code as string,
    type: row.type as "percent" | "fixed",
    value: Number(row.value),
    minOrder: Number(row.min_order),
    maxDiscount: row.max_discount ? Number(row.max_discount) : undefined,
    active: toBool(row.active),
    label: (row.label as string) ?? (row.code as string),
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
  return computeDiscountAmount(coupon, subtotal);
}

async function validateSellerDiscount(
  code: string,
  subtotal: number,
): Promise<{
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  message: string;
} | null> {
  if (!isMysqlConfigured()) return null;
  try {
    const rows = await mysqlQuery<RowDataPacket>(
      `SELECT * FROM seller_discounts
       WHERE UPPER(code) = ? AND active = 1
       ORDER BY created_at DESC LIMIT 1`,
      [code],
    );
    if (!rows.length) return null;
    const row = rows[0];
    const now = Date.now();
    if (row.starts_at && new Date(toIso(row.starts_at)).getTime() > now) {
      return { valid: false, discount: 0, message: "کد تخفیف هنوز فعال نیست" };
    }
    if (row.ends_at && new Date(toIso(row.ends_at)).getTime() < now) {
      return { valid: false, discount: 0, message: "کد تخفیف منقضی شده" };
    }
    const maxUses = row.max_uses != null ? Number(row.max_uses) : null;
    const usedCount = Number(row.used_count ?? 0);
    if (maxUses != null && usedCount >= maxUses) {
      return { valid: false, discount: 0, message: "سقف استفاده از کد پر شده" };
    }
    const coupon: Coupon = {
      code: String(row.code),
      type: row.type === "percent" ? "percent" : "fixed",
      value: Number(row.value),
      minOrder: Number(row.min_order ?? 0),
      active: true,
      label: `تخفیف فروشنده ${String(row.code)}`,
      sellerId: String(row.seller_id),
    };
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
  } catch {
    return null;
  }
}

export async function validateCouponAsync(
  code: string,
  subtotal: number,
  options?: { sellerIdsInCart?: string[] },
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
    const sellerResult = await validateSellerDiscount(normalized, subtotal);
    if (sellerResult) {
      if (
        sellerResult.valid &&
        sellerResult.coupon?.sellerId &&
        options?.sellerIdsInCart &&
        options.sellerIdsInCart.some(
          (id) => id !== sellerResult.coupon!.sellerId,
        )
      ) {
        return {
          valid: false,
          discount: 0,
          message:
            "این کد تخفیف فقط برای محصولات همان فروشنده قابل استفاده است",
        };
      }
      return sellerResult;
    }
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

/** Increment seller discount usage after a successful order. */
export async function incrementSellerDiscountUsage(
  code: string,
): Promise<void> {
  if (!isMysqlConfigured() || !code.trim()) return;
  try {
    await mysqlExecute(
      `UPDATE seller_discounts
       SET used_count = COALESCE(used_count, 0) + 1
       WHERE UPPER(code) = ? AND active = 1`,
      [code.trim().toUpperCase()],
    );
  } catch (error) {
    console.error(
      "[coupons] used_count increment failed:",
      error instanceof Error ? error.message : error,
    );
  }
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

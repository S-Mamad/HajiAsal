import { randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { CartItem, CheckoutFormData } from "@/types";
import { normalizePhone } from "@/lib/auth/phone";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetOrders,
  memoryPushOrder,
  memoryUpdateOrder,
} from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import type { ResultSetHeader } from "mysql2/promise";
import {
  asJson,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  parseJsonField,
  toIso,
  withMysqlTransaction,
} from "./mysql";
import { computeOrderTotal } from "@/lib/commerce/money";
import {
  decrementStockForPaidOrder,
  restoreStockForPaidOrder,
} from "./order-stock";
import { notifyTelegram } from "./telegram-notify";

export { computeOrderTotal } from "@/lib/commerce/money";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "online" | "snappay";

export interface StoredOrder {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  userId?: string;
  customer: CheckoutFormData;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  couponCode?: string;
  shippingMethod?: string;
  createdAt: string;
  updatedAt: string;
  trackingCode?: string;
  adminNote?: string;
  refundedAt?: string;
  refundNote?: string;
  /** Set after inventory is restored on refund/cancel of a paid order. */
  stockRestoredAt?: string;
}

const ORDERS_FILE = "orders.json";

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `HA-${timestamp}-${random}`;
}

function generateTrackingCode(): string {
  return `TRK-${randomBytes(6).toString("hex").toUpperCase()}`;
}

function mapRowToOrder(row: Record<string, unknown>): StoredOrder {
  return {
    id: row.id as string,
    status: row.status as OrderStatus,
    paymentMethod: (row.payment_method as PaymentMethod) ?? "online",
    customer: parseJsonField<CheckoutFormData>(row.customer, {} as CheckoutFormData),
    items: parseJsonField<CartItem[]>(row.items, []),
    subtotal: row.subtotal as number,
    shipping: row.shipping as number,
    discount: (row.discount as number) ?? 0,
    total: row.total as number,
    couponCode: (row.coupon_code as string) ?? undefined,
    shippingMethod: (row.shipping_method as string) ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    trackingCode: (row.tracking_code as string) ?? undefined,
    userId: (row.user_id as string) ?? undefined,
    adminNote: (row.admin_note as string) ?? undefined,
    refundedAt: row.refunded_at ? toIso(row.refunded_at) : undefined,
    refundNote: (row.refund_note as string) ?? undefined,
    stockRestoredAt: row.stock_restored_at
      ? toIso(row.stock_restored_at)
      : undefined,
  };
}

export async function createOrder(input: {
  customer: CheckoutFormData;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  couponCode?: string;
  paymentMethod?: PaymentMethod;
  shippingMethod?: string;
  userId?: string;
  /** When set (e.g. SnappPay +10%), overrides computed cash total */
  totalOverride?: number;
}): Promise<StoredOrder> {
  const discount = Math.max(0, input.discount ?? 0);
  const now = new Date().toISOString();
  const paymentMethod = input.paymentMethod ?? "online";
  const order: StoredOrder = {
    id: generateOrderId(),
    status: "pending_payment",
    paymentMethod,
    customer: input.customer,
    items: input.items,
    subtotal: input.subtotal,
    shipping: input.shipping,
    discount,
    total:
      typeof input.totalOverride === "number"
        ? Math.round(input.totalOverride)
        : computeOrderTotal(input.subtotal, input.shipping, discount),
    couponCode: input.couponCode,
    shippingMethod: input.shippingMethod,
    createdAt: now,
    updatedAt: now,
    trackingCode: generateTrackingCode(),
    userId: input.userId,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO orders (
          id, status, payment_method, user_id, customer, items,
          subtotal, shipping, discount, total, coupon_code, tracking_code,
          shipping_method, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.status,
          order.paymentMethod,
          order.userId ?? null,
          asJson(order.customer),
          asJson(order.items),
          order.subtotal,
          order.shipping,
          order.discount,
          order.total,
          order.couponCode ?? null,
          order.trackingCode,
          order.shippingMethod ?? null,
          order.createdAt,
          order.updatedAt,
        ],
      );
      return order;
    } catch (error) {
      console.error(
        "[orders] createOrder mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      if (process.env.NODE_ENV === "production") throw error;
    }
  }

  if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    orders.push(order);
    await writeJsonFile(ORDERS_FILE, orders);
    return order;
  }

  memoryPushOrder(order);
  return order;
}

export async function getOrderById(orderId: string): Promise<StoredOrder | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM orders WHERE id = ? LIMIT 1",
        [orderId],
      );
      if (row) return mapRowToOrder(row);
    } catch (error) {
      console.error(
        "[orders] getOrderById mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    return orders.find((o) => o.id === orderId) ?? null;
  }

  return memoryGetOrders<StoredOrder>().find((o) => o.id === orderId) ?? null;
}

export async function getOrderByTracking(
  trackingCode: string,
): Promise<StoredOrder | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM orders WHERE tracking_code = ? LIMIT 1",
        [trackingCode.toUpperCase()],
      );
      if (row) return mapRowToOrder(row);
    } catch (error) {
      console.error(
        "[orders] getOrderByTracking mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    return (
      orders.find(
        (o) => o.trackingCode?.toUpperCase() === trackingCode.toUpperCase(),
      ) ?? null
    );
  }

  return (
    memoryGetOrders<StoredOrder>().find(
      (o) => o.trackingCode?.toUpperCase() === trackingCode.toUpperCase(),
    ) ?? null
  );
}

export async function getOrderByPhoneAndTracking(
  phone: string,
  trackingCode: string,
): Promise<StoredOrder | null> {
  const order = await getOrderByTracking(trackingCode);
  if (!order) return null;
  if (normalizePhone(order.customer.phone) !== normalizePhone(phone)) {
    return null;
  }
  return order;
}

export async function getAllOrders(): Promise<StoredOrder[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM orders ORDER BY created_at DESC",
      );
      return rows.map(mapRowToOrder);
    } catch (error) {
      console.error(
        "[orders] getAllOrders mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (canUseFilesystemPersistence()) {
    return readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
  }
  return memoryGetOrders<StoredOrder>();
}

export async function getOrdersByUserId(userId: string): Promise<StoredOrder[]> {
  if (isMysqlConfigured()) {
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );
    return rows.map(mapRowToOrder);
  }

  if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    return orders.filter((o) => o.userId === userId);
  }

  return memoryGetOrders<StoredOrder>().filter((o) => o.userId === userId);
}

/** Paid / in-fulfillment statuses (excludes pending_payment and cancelled). */
export const PAID_OR_FULFILLING = new Set<OrderStatus>([
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

function orderMatchesPhone(order: StoredOrder, phone: string): boolean {
  return normalizePhone(order.customer?.phone ?? "") === phone;
}

function orderContainsProduct(order: StoredOrder, productId: string): boolean {
  return order.items.some((item) => item.productId === productId);
}

/** True if this phone has at least one paid/fulfilling order (buyer). */
export async function hasPurchasedByPhone(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const orders = await getAllOrders();
  return orders.some(
    (order) =>
      PAID_OR_FULFILLING.has(order.status) &&
      orderMatchesPhone(order, normalized),
  );
}

/** True if this phone has a paid/fulfilling order that includes the product. */
export async function hasPurchasedProductByPhone(
  phone: string,
  productId: string,
): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized || !productId) return false;

  const orders = await getAllOrders();
  return orders.some(
    (order) =>
      PAID_OR_FULFILLING.has(order.status) &&
      orderMatchesPhone(order, normalized) &&
      orderContainsProduct(order, productId),
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<StoredOrder | null> {
  return updateOrderAdmin(orderId, { status });
}

export type ConfirmPaidResult =
  | {
      ok: true;
      order: StoredOrder;
      alreadyConfirmed: boolean;
      stockShortages: string[];
    }
  | { ok: false; reason: "not_found" | "not_payable" };

async function burnCouponAfterPaid(previous: StoredOrder): Promise<void> {
  if (!previous.couponCode) return;
  const { getProductByIdAsync } = await import("./products-store");
  const { incrementCouponUsageForPaidOrder } = await import("./coupons");
  const sellerIdsInOrder: string[] = [];
  for (const item of previous.items) {
    const product = await getProductByIdAsync(item.productId);
    if (product?.sellerId) sellerIdsInOrder.push(product.sellerId);
  }
  try {
    await incrementCouponUsageForPaidOrder({
      couponCode: previous.couponCode,
      sellerIdsInOrder,
    });
  } catch (error) {
    console.error(
      "[orders] coupon used_count after payment failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

function shortageNote(shortages: string[]): string {
  return `کمبود موجودی پس از پرداخت: ${shortages.join(", ")}`;
}

/**
 * Atomically flip pending_payment → confirmed (payment verify path).
 * Idempotent when already paid/fulfilling. Burns coupon + decrements stock once.
 */
export async function confirmPaidOrder(
  orderId: string,
): Promise<ConfirmPaidResult> {
  const previous = await getOrderById(orderId);
  if (!previous) return { ok: false, reason: "not_found" };
  if (PAID_OR_FULFILLING.has(previous.status)) {
    return {
      ok: true,
      order: previous,
      alreadyConfirmed: true,
      stockShortages: [],
    };
  }
  if (previous.status !== "pending_payment") {
    return { ok: false, reason: "not_payable" };
  }

  const now = new Date().toISOString();
  let flipped = false;
  let stockShortages: string[] = [];

  if (isMysqlConfigured()) {
    try {
      const txResult = await withMysqlTransaction(async (conn) => {
        const [result] = await conn.execute<ResultSetHeader>(
          `UPDATE orders SET status = 'confirmed', updated_at = ?
           WHERE id = ? AND status = 'pending_payment'`,
          [now, orderId],
        );
        if (result.affectedRows === 0) {
          return { flipped: false, shortages: [] as string[] };
        }
        const shortages = await decrementStockForPaidOrder(previous.items, conn);
        if (shortages.length > 0) {
          const note = shortageNote(shortages);
          await conn.execute(
            `UPDATE orders SET admin_note = CASE
               WHEN admin_note IS NULL OR admin_note = '' THEN ?
               ELSE CONCAT(admin_note, ' | ', ?)
             END
             WHERE id = ?`,
            [note, note, orderId],
          );
        }
        return { flipped: true, shortages };
      });
      flipped = txResult.flipped;
      stockShortages = txResult.shortages;
    } catch (error) {
      console.error(
        "[orders] confirmPaidOrder mysql tx failed:",
        error instanceof Error ? error.message : error,
      );
      // Production: do not confirm outside the transaction.
      // Local/dev: fall through to file/memory so sandbox verify can complete.
      if (process.env.NODE_ENV === "production") {
        return { ok: false, reason: "not_payable" };
      }
    }
  }

  if (!flipped) {
    if (canUseFilesystemPersistence()) {
      const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
      const idx = orders.findIndex((o) => o.id === orderId);
      if (idx >= 0 && orders[idx]!.status === "pending_payment") {
        stockShortages = await decrementStockForPaidOrder(previous.items);
        const note =
          stockShortages.length > 0 ? shortageNote(stockShortages) : undefined;
        orders[idx] = {
          ...orders[idx]!,
          status: "confirmed",
          updatedAt: now,
          ...(note
            ? {
                adminNote: orders[idx]!.adminNote
                  ? `${orders[idx]!.adminNote} | ${note}`
                  : note,
              }
            : {}),
        };
        await writeJsonFile(ORDERS_FILE, orders);
        flipped = true;
      }
    } else {
      const current = await getOrderById(orderId);
      if (current?.status === "pending_payment") {
        stockShortages = await decrementStockForPaidOrder(previous.items);
        const note =
          stockShortages.length > 0 ? shortageNote(stockShortages) : undefined;
        await memoryUpdateOrder<StoredOrder>(orderId, {
          status: "confirmed",
          updatedAt: now,
          ...(note
            ? {
                adminNote: current.adminNote
                  ? `${current.adminNote} | ${note}`
                  : note,
              }
            : {}),
        });
        flipped = true;
      }
    }
  }

  if (!flipped) {
    const current = await getOrderById(orderId);
    if (current && PAID_OR_FULFILLING.has(current.status)) {
      return {
        ok: true,
        order: current,
        alreadyConfirmed: true,
        stockShortages: [],
      };
    }
    return { ok: false, reason: "not_payable" };
  }

  await burnCouponAfterPaid(previous);
  const updated = await getOrderById(orderId);
  if (!updated) return { ok: false, reason: "not_found" };

  void notifyTelegram("order.paid", { order: updated });
  if (stockShortages.length > 0) {
    void notifyTelegram("inventory.out_of_stock", {
      orderId: updated.id,
      productNames: stockShortages,
    });
  }

  return {
    ok: true,
    order: updated,
    alreadyConfirmed: false,
    stockShortages,
  };
}

/** Cancel unpaid orders older than ttlMs (default 24h). Safe for create-order path. */
export async function expireStalePendingOrders(
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<number> {
  const cutoff = Date.now() - ttlMs;
  let cancelled = 0;

  if (isMysqlConfigured()) {
    try {
      const result = await mysqlExecute(
        `UPDATE orders SET status = 'cancelled', updated_at = ?
         WHERE status = 'pending_payment' AND created_at < ?`,
        [new Date().toISOString(), new Date(cutoff).toISOString()],
      );
      return result.affectedRows;
    } catch (error) {
      console.error(
        "[orders] expireStalePendingOrders mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const applyList = async (orders: StoredOrder[]) => {
    let changed = false;
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i]!;
      if (
        o.status === "pending_payment" &&
        new Date(o.createdAt).getTime() < cutoff
      ) {
        orders[i] = {
          ...o,
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        };
        cancelled += 1;
        changed = true;
      }
    }
    return changed;
  };

  if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    if (await applyList(orders)) {
      await writeJsonFile(ORDERS_FILE, orders);
    }
    return cancelled;
  }

  const mem = memoryGetOrders() as StoredOrder[];
  await applyList(mem);
  return cancelled;
}

export async function updateOrderAdmin(
  orderId: string,
  patch: {
    status?: OrderStatus;
    trackingCode?: string | null;
    adminNote?: string | null;
    refundedAt?: string | null;
    refundNote?: string | null;
    stockRestoredAt?: string | null;
  },
): Promise<StoredOrder | null> {
  const needsPrevious =
    patch.status === "delivered" ||
    patch.status === "confirmed" ||
    patch.status === "cancelled" ||
    Boolean(patch.refundedAt);
  const previous = needsPrevious ? await getOrderById(orderId) : null;
  const now = new Date().toISOString();

  // Credit wallet before status flip so a failure leaves the order undelivered.
  if (
    patch.status === "delivered" &&
    previous &&
    previous.status !== "delivered"
  ) {
    const { creditSellersForDeliveredOrder } = await import("./seller-wallet");
    await creditSellersForDeliveredOrder({
      ...previous,
      status: "delivered",
    });
  }

  let updated: StoredOrder | null = null;
  const confirmingFromPending =
    patch.status === "confirmed" && previous?.status === "pending_payment";

  if (isMysqlConfigured()) {
    const sets: string[] = ["updated_at = ?"];
    const params: unknown[] = [now];
    if (patch.status !== undefined) {
      sets.push("status = ?");
      params.push(patch.status);
    }
    if (patch.trackingCode !== undefined) {
      sets.push("tracking_code = ?");
      params.push(patch.trackingCode);
    }
    if (patch.adminNote !== undefined) {
      sets.push("admin_note = ?");
      params.push(patch.adminNote);
    }
    if (patch.refundedAt !== undefined) {
      sets.push("refunded_at = ?");
      params.push(patch.refundedAt);
    }
    if (patch.refundNote !== undefined) {
      sets.push("refund_note = ?");
      params.push(patch.refundNote);
    }
    if (patch.stockRestoredAt !== undefined) {
      sets.push("stock_restored_at = ?");
      params.push(patch.stockRestoredAt);
    }

    // Atomic guard when admin/seller confirms an unpaid order via this path.
    if (confirmingFromPending) {
      params.push(orderId);
      try {
        const result = await mysqlExecute(
          `UPDATE orders SET ${sets.join(", ")} WHERE id = ? AND status = 'pending_payment'`,
          params,
        );
        if (result.affectedRows === 0) {
          const current = await getOrderById(orderId);
          if (current && PAID_OR_FULFILLING.has(current.status)) return current;
          return null;
        }
        updated = await getOrderById(orderId);
      } catch {
        updated = null;
      }
    } else {
      params.push(orderId);
      try {
        const result = await mysqlExecute(
          `UPDATE orders SET ${sets.join(", ")} WHERE id = ?`,
          params,
        );
        if (result.affectedRows === 0) return null;
        updated = await getOrderById(orderId);
      } catch (error) {
        // Never silently drop refund fields: that can show success without refundedAt.
        if (
          patch.refundedAt !== undefined ||
          patch.refundNote !== undefined
        ) {
          throw error instanceof Error
            ? error
            : new Error("ذخیره استرداد سفارش ناموفق بود");
        }
        const basicSets = ["updated_at = ?"];
        const basicParams: unknown[] = [now];
        if (patch.status !== undefined) {
          basicSets.push("status = ?");
          basicParams.push(patch.status);
        }
        if (patch.trackingCode !== undefined) {
          basicSets.push("tracking_code = ?");
          basicParams.push(patch.trackingCode);
        }
        if (patch.adminNote !== undefined) {
          basicSets.push("admin_note = ?");
          basicParams.push(patch.adminNote);
        }
        basicParams.push(orderId);
        const result = await mysqlExecute(
          `UPDATE orders SET ${basicSets.join(", ")} WHERE id = ?`,
          basicParams,
        );
        if (result.affectedRows === 0) return null;
        updated = await getOrderById(orderId);
      }
    }
  } else if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    if (
      confirmingFromPending &&
      orders[idx]!.status !== "pending_payment"
    ) {
      return orders[idx]!;
    }
    orders[idx] = {
      ...orders[idx]!,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.trackingCode !== undefined
        ? { trackingCode: patch.trackingCode ?? undefined }
        : {}),
      ...(patch.adminNote !== undefined
        ? { adminNote: patch.adminNote ?? undefined }
        : {}),
      ...(patch.refundedAt !== undefined
        ? { refundedAt: patch.refundedAt ?? undefined }
        : {}),
      ...(patch.refundNote !== undefined
        ? { refundNote: patch.refundNote ?? undefined }
        : {}),
      ...(patch.stockRestoredAt !== undefined
        ? { stockRestoredAt: patch.stockRestoredAt ?? undefined }
        : {}),
      updatedAt: now,
    };
    await writeJsonFile(ORDERS_FILE, orders);
    updated = orders[idx]!;
  } else {
    if (confirmingFromPending) {
      const cur = await getOrderById(orderId);
      if (!cur || cur.status !== "pending_payment") {
        return cur && PAID_OR_FULFILLING.has(cur.status) ? cur : null;
      }
    }
    updated = await memoryUpdateOrder<StoredOrder>(orderId, {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.trackingCode !== undefined
        ? { trackingCode: patch.trackingCode ?? undefined }
        : {}),
      ...(patch.adminNote !== undefined
        ? { adminNote: patch.adminNote ?? undefined }
        : {}),
      ...(patch.refundedAt !== undefined
        ? { refundedAt: patch.refundedAt ?? undefined }
        : {}),
      ...(patch.refundNote !== undefined
        ? { refundNote: patch.refundNote ?? undefined }
        : {}),
      ...(patch.stockRestoredAt !== undefined
        ? { stockRestoredAt: patch.stockRestoredAt ?? undefined }
        : {}),
      updatedAt: now,
    });
  }

  // Side effects only on real pending_payment → confirmed transition.
  if (updated && confirmingFromPending && previous) {
    await burnCouponAfterPaid(previous);
    const stockShortages = await decrementStockForPaidOrder(previous.items);
    if (stockShortages.length > 0) {
      const note = shortageNote(stockShortages);
      const mergedNote = updated.adminNote
        ? `${updated.adminNote} | ${note}`
        : note;
      // Avoid re-entering confirm side effects: patch note only.
      if (isMysqlConfigured()) {
        try {
          await mysqlExecute(
            `UPDATE orders SET admin_note = ?, updated_at = ? WHERE id = ?`,
            [mergedNote, new Date().toISOString(), orderId],
          );
        } catch {
          /* ignore note persist */
        }
      } else if (canUseFilesystemPersistence()) {
        const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
        const idx = orders.findIndex((o) => o.id === orderId);
        if (idx >= 0) {
          orders[idx] = { ...orders[idx]!, adminNote: mergedNote };
          await writeJsonFile(ORDERS_FILE, orders);
        }
      } else {
        await memoryUpdateOrder<StoredOrder>(orderId, { adminNote: mergedNote });
      }
      updated = { ...updated, adminNote: mergedNote };
    }
  }

  // Claw back seller sale credits on cancel/refund (idempotent via ledger).
  if (updated && previous) {
    const refunding = Boolean(patch.refundedAt) && !previous.refundedAt;
    const cancelling =
      patch.status === "cancelled" && previous.status !== "cancelled";
    if (refunding || cancelling) {
      try {
        const { reverseSaleCreditsForOrder } = await import("./seller-wallet");
        await reverseSaleCreditsForOrder(previous);
      } catch (error) {
        console.error(
          "[orders] wallet clawback failed:",
          error instanceof Error ? error.message : error,
        );
        throw error instanceof Error
          ? error
          : new Error("برگشت اعتبار فروشنده ناموفق بود");
      }
    }
  }

  // Restore stock when refunding or cancelling a previously stock-decremented order.
  if (
    updated &&
    previous &&
    !previous.stockRestoredAt &&
    !updated.stockRestoredAt &&
    !previous.adminNote?.includes("[STOCK_RESTORED]") &&
    !updated.adminNote?.includes("[STOCK_RESTORED]")
  ) {
    const stockHeld = PAID_OR_FULFILLING.has(previous.status);
    const refunding = Boolean(patch.refundedAt) && !previous.refundedAt;
    const cancellingPaid =
      patch.status === "cancelled" && previous.status !== "cancelled" && stockHeld;
    if (stockHeld && (refunding || cancellingPaid)) {
      try {
        await restoreStockForPaidOrder(previous.items);
        const restoredAt = new Date().toISOString();
        const markNote = updated.adminNote
          ? `${updated.adminNote} | [STOCK_RESTORED]`
          : "[STOCK_RESTORED]";
        if (isMysqlConfigured()) {
          try {
            await mysqlExecute(
              `ALTER TABLE orders ADD COLUMN stock_restored_at DATETIME(3) NULL`,
            );
          } catch {
            /* column exists */
          }
          try {
            await mysqlExecute(
              `UPDATE orders SET stock_restored_at = ?, admin_note = ?, updated_at = ? WHERE id = ?`,
              [restoredAt, markNote, restoredAt, orderId],
            );
          } catch {
            try {
              await mysqlExecute(
                `UPDATE orders SET admin_note = ?, updated_at = ? WHERE id = ?`,
                [markNote, restoredAt, orderId],
              );
            } catch {
              /* ignore */
            }
          }
        } else if (canUseFilesystemPersistence()) {
          const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
          const idx = orders.findIndex((o) => o.id === orderId);
          if (idx >= 0) {
            orders[idx] = {
              ...orders[idx]!,
              stockRestoredAt: restoredAt,
              adminNote: markNote,
            };
            await writeJsonFile(ORDERS_FILE, orders);
          }
        } else {
          await memoryUpdateOrder<StoredOrder>(orderId, {
            stockRestoredAt: restoredAt,
            adminNote: markNote,
          });
        }
        updated = {
          ...updated,
          stockRestoredAt: restoredAt,
          adminNote: markNote,
        };
      } catch (error) {
        console.error(
          "[orders] stock restore failed:",
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  return updated;
}

export function getPersistenceMode(): "mysql" | "file" | "memory" {
  if (isMysqlConfigured()) return "mysql";
  if (canUseFilesystemPersistence()) return "file";
  return "memory";
}

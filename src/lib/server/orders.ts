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
import {
  asJson,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  parseJsonField,
  toIso,
} from "./mysql";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cod" | "card_to_card" | "online";

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
}

const ORDERS_FILE = "orders.json";

function generateOrderId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HA-${timestamp}-${random}`;
}

function generateTrackingCode(): string {
  return `TRK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

function mapRowToOrder(row: Record<string, unknown>): StoredOrder {
  return {
    id: row.id as string,
    status: row.status as OrderStatus,
    paymentMethod: (row.payment_method as PaymentMethod) ?? "cod",
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
}): Promise<StoredOrder> {
  const discount = input.discount ?? 0;
  const now = new Date().toISOString();
  const paymentMethod = input.paymentMethod ?? "cod";
  const order: StoredOrder = {
    id: generateOrderId(),
    status: paymentMethod === "cod" ? "confirmed" : "pending_payment",
    paymentMethod,
    customer: input.customer,
    items: input.items,
    subtotal: input.subtotal,
    shipping: input.shipping,
    discount,
    total: input.subtotal + input.shipping - discount,
    couponCode: input.couponCode,
    shippingMethod: input.shippingMethod,
    createdAt: now,
    updatedAt: now,
    trackingCode: generateTrackingCode(),
    userId: input.userId,
  };

  if (isMysqlConfigured()) {
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
    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM orders WHERE id = ? LIMIT 1",
      [orderId],
    );
    return row ? mapRowToOrder(row) : null;
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
    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT * FROM orders WHERE tracking_code = ? LIMIT 1",
      [trackingCode.toUpperCase()],
    );
    return row ? mapRowToOrder(row) : null;
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
  if (order.customer.phone !== phone) return null;
  return order;
}

export async function getAllOrders(): Promise<StoredOrder[]> {
  if (isMysqlConfigured()) {
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT * FROM orders ORDER BY created_at DESC",
    );
    return rows.map(mapRowToOrder);
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

/** True if this phone has at least one non-cancelled order (buyer). */
export async function hasPurchasedByPhone(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  const orders = await getAllOrders();
  return orders.some((order) => {
    if (order.status === "cancelled") return false;
    return normalizePhone(order.customer?.phone ?? "") === normalized;
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<StoredOrder | null> {
  return updateOrderAdmin(orderId, { status });
}

export async function updateOrderAdmin(
  orderId: string,
  patch: {
    status?: OrderStatus;
    trackingCode?: string | null;
    adminNote?: string | null;
    refundedAt?: string | null;
    refundNote?: string | null;
  },
): Promise<StoredOrder | null> {
  const now = new Date().toISOString();
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
    // refund columns may not exist until migration; ignore failures via try/catch below
    if (patch.refundedAt !== undefined) {
      sets.push("refunded_at = ?");
      params.push(patch.refundedAt);
    }
    if (patch.refundNote !== undefined) {
      sets.push("refund_note = ?");
      params.push(patch.refundNote);
    }
    params.push(orderId);
    try {
      const result = await mysqlExecute(
        `UPDATE orders SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      if (result.affectedRows === 0) return null;
      return getOrderById(orderId);
    } catch {
      // Fallback without refund columns
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
      return getOrderById(orderId);
    }
  }

  if (canUseFilesystemPersistence()) {
    const orders = await readJsonFile<StoredOrder[]>(ORDERS_FILE, []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
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
      updatedAt: now,
    };
    await writeJsonFile(ORDERS_FILE, orders);
    return orders[idx]!;
  }

  return memoryUpdateOrder<StoredOrder>(orderId, {
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
    updatedAt: now,
  });
}

export function getPersistenceMode(): "mysql" | "file" | "memory" {
  if (isMysqlConfigured()) return "mysql";
  if (canUseFilesystemPersistence()) return "file";
  return "memory";
}

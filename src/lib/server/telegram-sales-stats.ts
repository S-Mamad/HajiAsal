import type { StoredOrder, OrderStatus, PaymentMethod } from "./orders";

/** Paid funnel statuses (after confirmPaidOrder). Excludes pending/cancelled. */
export const PAID_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

/** Pending checkouts newer than this count as "active" in digests. */
export const FRESH_PENDING_MS = 24 * 60 * 60 * 1000;

export function isPaidOrderStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return PAID_ORDER_STATUSES.has(status as OrderStatus);
}

export function tehranDateKey(isoOrNow?: string | Date): string {
  const d =
    isoOrNow instanceof Date
      ? isoOrNow
      : isoOrNow
        ? new Date(isoOrNow)
        : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** YYYY-MM for Asia/Tehran */
export function tehranMonthKey(isoOrNow?: string | Date): string {
  const key = tehranDateKey(isoOrNow);
  return key ? key.slice(0, 7) : "";
}

/**
 * Last N calendar days in Tehran including today (as YYYY-MM-DD keys).
 * Walks calendar dates (not raw UTC ms) to avoid day skips near midnight.
 */
export function tehranLastNDateKeys(n: number, now = new Date()): string[] {
  if (n <= 0) return [];
  const today = tehranDateKey(now);
  if (!today) return [];
  const parts = today.split("-").map((p) => Number(p));
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return [];

  // Noon UTC on the Tehran calendar date → safe day arithmetic.
  const baseUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const dt = new Date(baseUtc - i * 86_400_000);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    keys.push(`${yy}-${mm}-${dd}`);
  }
  return keys;
}

/** Human stamp for digest header (Jalali + Tehran clock). */
export function formatTehranDigestStamp(now = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    calendar: "persian",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

export type TelegramSalesStats = {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  salesYesterday: number;
  ordersToday: number;
  ordersWeek: number;
  ordersMonth: number;
  ordersYesterday: number;
  pendingOrders: number;
  pendingOrdersFresh: number;
  pendingOrdersStale: number;
  avgOrderValue: number;
  avgOrderValueToday: number;
  avgOrderValueWeek: number;
  totalPaidRevenue: number;
  paidOrdersCount: number;
  salesZibalToday: number;
  salesSnappayToday: number;
  customersCount?: number;
  lowStockCount?: number;
};

export type SalesOrderLike = {
  status: string;
  total: number;
  createdAt: string;
  paymentMethod?: PaymentMethod | string;
  refundedAt?: string | null;
};

export function computeTelegramSalesStats(
  orders: SalesOrderLike[],
  extras?: { customersCount?: number; lowStockCount?: number; now?: Date },
): TelegramSalesStats {
  const now = extras?.now ?? new Date();
  const todayKey = tehranDateKey(now);
  const yesterdayKey = tehranLastNDateKeys(2, now)[1] ?? "";
  const monthKey = tehranMonthKey(now);
  const weekKeys = new Set(tehranLastNDateKeys(7, now));
  const nowMs = now.getTime();

  let salesToday = 0;
  let salesWeek = 0;
  let salesMonth = 0;
  let salesYesterday = 0;
  let ordersToday = 0;
  let ordersWeek = 0;
  let ordersMonth = 0;
  let ordersYesterday = 0;
  let salesZibalToday = 0;
  let salesSnappayToday = 0;
  let totalPaidRevenue = 0;
  let paidOrdersCount = 0;
  let pendingOrders = 0;
  let pendingOrdersFresh = 0;
  let pendingOrdersStale = 0;

  for (const o of orders) {
    if (o.status === "pending_payment") {
      pendingOrders += 1;
      const createdMs = new Date(o.createdAt).getTime();
      const age = Number.isFinite(createdMs) ? nowMs - createdMs : Infinity;
      if (age <= FRESH_PENDING_MS) pendingOrdersFresh += 1;
      else pendingOrdersStale += 1;
    }
    if (!isPaidOrderStatus(o.status)) continue;
    if (o.refundedAt) continue;

    const total = Number(o.total) || 0;
    const dayKey = tehranDateKey(o.createdAt);
    const mKey = tehranMonthKey(o.createdAt);

    totalPaidRevenue += total;
    paidOrdersCount += 1;

    if (dayKey === todayKey) {
      salesToday += total;
      ordersToday += 1;
      if (o.paymentMethod === "snappay") salesSnappayToday += total;
      else salesZibalToday += total;
    }
    if (dayKey === yesterdayKey) {
      salesYesterday += total;
      ordersYesterday += 1;
    }
    if (weekKeys.has(dayKey)) {
      salesWeek += total;
      ordersWeek += 1;
    }
    if (mKey === monthKey) {
      salesMonth += total;
      ordersMonth += 1;
    }
  }

  return {
    salesToday,
    salesWeek,
    salesMonth,
    salesYesterday,
    ordersToday,
    ordersWeek,
    ordersMonth,
    ordersYesterday,
    pendingOrders,
    pendingOrdersFresh,
    pendingOrdersStale,
    avgOrderValue: paidOrdersCount
      ? Math.round(totalPaidRevenue / paidOrdersCount)
      : 0,
    avgOrderValueToday: ordersToday
      ? Math.round(salesToday / ordersToday)
      : 0,
    avgOrderValueWeek: ordersWeek ? Math.round(salesWeek / ordersWeek) : 0,
    totalPaidRevenue,
    paidOrdersCount,
    salesZibalToday,
    salesSnappayToday,
    customersCount: extras?.customersCount,
    lowStockCount: extras?.lowStockCount,
  };
}

/** Prefer StoredOrder-shaped lists from getAllOrders. */
export function statsFromStoredOrders(
  orders: Array<{
    status: string;
    total: number;
    createdAt: string;
    paymentMethod?: PaymentMethod | string;
    refundedAt?: string | null;
  }>,
  extras?: { customersCount?: number; lowStockCount?: number; now?: Date },
): TelegramSalesStats {
  return computeTelegramSalesStats(orders, extras);
}

export type { StoredOrder };

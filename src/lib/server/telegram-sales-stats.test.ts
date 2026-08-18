import { describe, expect, it } from "vitest";
import {
  computeTelegramSalesStats,
  tehranDateKey,
  tehranLastNDateKeys,
  FRESH_PENDING_MS,
} from "./telegram-sales-stats";

describe("telegram-sales-stats", () => {
  it("tehranDateKey returns YYYY-MM-DD", () => {
    const key = tehranDateKey("2026-03-20T10:00:00.000Z");
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("tehranLastNDateKeys walks calendar days without duplicates", () => {
    const keys = tehranLastNDateKeys(7, new Date("2026-08-13T12:00:00+03:30"));
    expect(keys).toHaveLength(7);
    expect(new Set(keys).size).toBe(7);
    expect(keys[0]).toBe("2026-08-13");
    expect(keys[6]).toBe("2026-08-07");
  });

  it("counts only paid non-refunded orders for sales", () => {
    const today = tehranDateKey();
    const orders = [
      {
        status: "pending_payment",
        total: 1_000_000,
        createdAt: new Date().toISOString(),
        paymentMethod: "online",
      },
      {
        status: "cancelled",
        total: 500_000,
        createdAt: new Date().toISOString(),
        paymentMethod: "online",
      },
      {
        status: "confirmed",
        total: 200_000,
        createdAt: new Date().toISOString(),
        paymentMethod: "online",
      },
      {
        status: "confirmed",
        total: 100_000,
        createdAt: new Date().toISOString(),
        paymentMethod: "snappay",
        refundedAt: new Date().toISOString(),
      },
      {
        status: "shipped",
        total: 50_000,
        createdAt: new Date().toISOString(),
        paymentMethod: "snappay",
      },
    ];

    const stats = computeTelegramSalesStats(orders);
    expect(stats.salesToday).toBe(250_000);
    expect(stats.ordersToday).toBe(2);
    expect(stats.salesZibalToday).toBe(200_000);
    expect(stats.salesSnappayToday).toBe(50_000);
    expect(stats.pendingOrders).toBe(1);
    expect(stats.pendingOrdersFresh).toBe(1);
    expect(stats.pendingOrdersStale).toBe(0);
    expect(stats.avgOrderValue).toBe(125_000);
    expect(stats.avgOrderValueToday).toBe(125_000);
    expect(tehranLastNDateKeys(7)).toContain(today);
  });

  it("separates stale pending and uses today AOV not lifetime", () => {
    const now = new Date("2026-08-13T15:00:00+03:30");
    const staleAt = new Date(now.getTime() - FRESH_PENDING_MS - 60_000).toISOString();
    const todayIso = now.toISOString();
    const olderPaid = new Date(now.getTime() - 3 * 86_400_000).toISOString();

    const stats = computeTelegramSalesStats(
      [
        {
          status: "pending_payment",
          total: 10_000,
          createdAt: staleAt,
        },
        {
          status: "pending_payment",
          total: 20_000,
          createdAt: todayIso,
        },
        {
          status: "confirmed",
          total: 100_000,
          createdAt: todayIso,
          paymentMethod: "online",
        },
        {
          status: "confirmed",
          total: 300_000,
          createdAt: olderPaid,
          paymentMethod: "online",
        },
      ],
      { now },
    );

    expect(stats.pendingOrders).toBe(2);
    expect(stats.pendingOrdersFresh).toBe(1);
    expect(stats.pendingOrdersStale).toBe(1);
    expect(stats.salesToday).toBe(100_000);
    expect(stats.avgOrderValueToday).toBe(100_000);
    expect(stats.avgOrderValue).toBe(200_000);
    expect(stats.ordersWeek).toBe(2);
  });
});

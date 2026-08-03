import { NextResponse } from "next/server";
import { adminHasPermission } from "@/lib/server/admin-auth";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  getDashboardStats,
  listQuestions,
  listTickets,
} from "@/lib/server/admin-platform-store";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { getAllOrders } from "@/lib/server/orders";
import { getAllProductsAsync } from "@/lib/server/products-store";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "dashboard.view");
  if (!gate.ok) return gate.response;

  const canViewMessages = adminHasPermission(gate.ctx, "messages.view");

  try {
    const stats = await getDashboardStats().catch(() => ({
      salesToday: 0,
      salesWeek: 0,
      salesMonth: 0,
      customersCount: 0,
      lowStockCount: 0,
      avgOrderValue: 0,
      recentCustomers: [] as unknown[],
      salesChart: [] as { date: string; total: number }[],
      ordersChart: [] as { date: string; count: number }[],
    }));
    const [orders, messages, products, tickets, questions] = await Promise.all([
      getAllOrders().catch(() => []),
      canViewMessages
        ? getContactMessagesBySource("hajiasal").catch(() => [])
        : Promise.resolve([]),
      getAllProductsAsync({ scope: "admin" }).catch(() => []),
      listTickets().catch(() => []),
      listQuestions().catch(() => []),
    ]);

    const activeOrders = orders.filter((o) => o.status !== "cancelled");
    const pendingOrders = orders.filter(
      (o) => o.status === "pending_payment" || o.status === "confirmed",
    );
    const unreadMessages = messages.filter((m) => !m.readAt);
    const outOfStock = products.filter((p) => !p.inStock);
    const openTickets = tickets.filter(
      (t) => t.status === "open" || t.status === "new" || t.status === "pending",
    );
    const openQa = questions.filter(
      (q) => q.status === "pending" || q.status === "open" || !q.answer,
    );

    return NextResponse.json({
      kpis: {
        totalOrders: orders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue: activeOrders.reduce((sum, o) => sum + o.total, 0),
        unreadMessages: canViewMessages ? unreadMessages.length : 0,
        totalProducts: products.length,
        outOfStock: outOfStock.length,
        salesToday: stats.salesToday,
        salesWeek: stats.salesWeek,
        salesMonth: stats.salesMonth,
        customersCount: stats.customersCount,
        lowStockCount: stats.lowStockCount,
        avgOrderValue: stats.avgOrderValue || (
          activeOrders.length
            ? Math.round(
                activeOrders.reduce((s, o) => s + o.total, 0) / activeOrders.length,
              )
            : 0
        ),
      },
      navBadges: {
        messages: canViewMessages ? unreadMessages.length : 0,
        tickets: openTickets.length,
        qa: openQa.length,
      },
      recentOrders: orders.slice(0, 8),
      recentMessages: canViewMessages ? messages.slice(0, 6) : [],
      recentCustomers: stats.recentCustomers,
      salesChart: stats.salesChart,
      ordersChart: stats.ordersChart,
    });
  } catch (error) {
    console.error(
      "[admin/dashboard] GET failed:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error: "خطا در بارگذاری داشبورد",
        success: false,
        kpis: {
          totalOrders: 0,
          pendingOrders: 0,
          totalRevenue: 0,
          unreadMessages: 0,
          totalProducts: 0,
          outOfStock: 0,
          salesToday: 0,
          salesWeek: 0,
          salesMonth: 0,
          customersCount: 0,
          lowStockCount: 0,
          avgOrderValue: 0,
        },
        navBadges: { messages: 0, tickets: 0, qa: 0 },
        recentOrders: [],
        recentMessages: [],
        recentCustomers: [],
        salesChart: [],
        ordersChart: [],
      },
      { status: 200 },
    );
  }
}

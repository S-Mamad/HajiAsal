import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { getDashboardStats } from "@/lib/server/admin-platform-store";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { getAllOrders } from "@/lib/server/orders";
import { getAllProductsAsync } from "@/lib/server/products-store";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "dashboard.view");
  if (!gate.ok) return gate.response;

  const stats = await getDashboardStats();
  const [orders, messages, products] = await Promise.all([
    getAllOrders(),
    getContactMessagesBySource("hajiasal"),
    getAllProductsAsync({ scope: "admin" }),
  ]);

  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const pendingOrders = orders.filter(
    (o) => o.status === "pending_payment" || o.status === "confirmed",
  );
  const unreadMessages = messages.filter((m) => !m.readAt);
  const outOfStock = products.filter((p) => !p.inStock);

  return NextResponse.json({
    kpis: {
      totalOrders: orders.length,
      pendingOrders: pendingOrders.length,
      totalRevenue: activeOrders.reduce((sum, o) => sum + o.total, 0),
      unreadMessages: unreadMessages.length,
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
    recentOrders: orders.slice(0, 8),
    recentMessages: messages.slice(0, 6),
    recentCustomers: stats.recentCustomers,
    salesChart: stats.salesChart,
    ordersChart: stats.ordersChart,
  });
}

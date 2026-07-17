import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { getAllOrders } from "@/lib/server/orders";
import { getAllProductsAsync } from "@/lib/server/products-store";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

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

  const kpis = {
    totalOrders: orders.length,
    pendingOrders: pendingOrders.length,
    totalRevenue: activeOrders.reduce((sum, o) => sum + o.total, 0),
    unreadMessages: unreadMessages.length,
    totalProducts: products.length,
    outOfStock: outOfStock.length,
  };

  return NextResponse.json({
    kpis,
    recentOrders: orders.slice(0, 8),
    recentMessages: messages.slice(0, 6),
  });
}

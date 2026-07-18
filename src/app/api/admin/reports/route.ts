import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { getAllOrders } from "@/lib/server/orders";
import { getAllProductsAsync } from "@/lib/server/products-store";

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "reports.view");
  if (!__gate.ok) return __gate.response;

  const [orders, products] = await Promise.all([
    getAllOrders(),
    getAllProductsAsync({ scope: "admin" }),
  ]);

  const countable = orders.filter((o) => o.status !== "cancelled");

  const byStatus: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  }

  const productSales: Record<
    string,
    { title: string; qty: number; revenue: number }
  > = {};
  for (const o of countable) {
    for (const item of o.items) {
      const key = item.productId;
      if (!productSales[key]) {
        productSales[key] = { title: item.title, qty: 0, revenue: 0 };
      }
      productSales[key].qty += item.quantity;
      productSales[key].revenue += item.weight.price * item.quantity;
    }
  }

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const last30Days = countable.filter((o) => {
    const d = new Date(o.createdAt).getTime();
    return d > Date.now() - 30 * 24 * 60 * 60 * 1000;
  });

  const dailySales: Record<string, number> = {};
  for (const o of last30Days) {
    const day = o.createdAt.split("T")[0]!;
    dailySales[day] = (dailySales[day] ?? 0) + o.total;
  }

  const dailySeries = Object.entries(dailySales)
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalRevenue: countable.reduce((s, o) => s + o.total, 0),
    orderCount: orders.length,
    byStatus,
    topProducts,
    dailySales,
    dailySeries,
    productCount: products.length,
  });
}

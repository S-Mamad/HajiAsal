import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import { getSellerOrders, getSellerProducts } from "@/lib/server/sellers";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "reports.view");
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "sales";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const orders = await getSellerOrders(gated.ctx.seller.id);
  const products = await getSellerProducts(gated.ctx.seller.id);

  const inRange = (iso: string) => {
    if (from && iso < from) return false;
    if (to && iso > `${to}T23:59:59`) return false;
    return true;
  };

  const filtered = orders.filter((o) => inRange(o.createdAt));

  if (type === "products") {
    return NextResponse.json({
      type,
      rows: products.map((p) => ({
        id: p.id,
        title: p.title,
        inStock: p.inStock,
        stockQty: p.stockQty ?? (p.inStock ? 1 : 0),
        approvalStatus: p.approvalStatus,
      })),
    });
  }

  if (type === "orders") {
    return NextResponse.json({
      type,
      rows: filtered.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.sellerSubtotal,
        customer: o.customer.fullName,
        createdAt: o.createdAt,
      })),
    });
  }

  if (type === "customers") {
    const map = new Map<string, { name: string; phone: string; orders: number; spent: number }>();
    for (const o of filtered) {
      const key = o.customer.phone;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          name: o.customer.fullName,
          phone: o.customer.phone,
          orders: 1,
          spent: o.sellerSubtotal,
        });
      } else {
        prev.orders += 1;
        prev.spent += o.sellerSubtotal;
      }
    }
    return NextResponse.json({ type, rows: Array.from(map.values()) });
  }

  // sales default
  const byDay = new Map<string, number>();
  for (const o of filtered) {
    if (o.status === "cancelled") continue;
    const day = o.createdAt.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + o.sellerSubtotal);
  }
  return NextResponse.json({
    type: "sales",
    total: filtered
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.sellerSubtotal, 0),
    rows: Array.from(byDay.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  });
}

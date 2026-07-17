import { NextResponse } from "next/server";
import {
  getSellerFromRequest,
  getSellerOrders,
  toPublicSeller,
} from "@/lib/server/sellers";

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const orders = await getSellerOrders(seller.id);
  const active = orders.filter((o) => o.status !== "cancelled");

  const byStatus: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  }

  const totalEarnings = active.reduce((s, o) => s + o.sellerSubtotal, 0);
  const last30 = active.filter(
    (o) =>
      new Date(o.createdAt).getTime() >
      Date.now() - 30 * 24 * 60 * 60 * 1000,
  );
  const monthEarnings = last30.reduce((s, o) => s + o.sellerSubtotal, 0);

  return NextResponse.json({
    seller: toPublicSeller(seller),
    totalEarnings,
    monthEarnings,
    orderCount: orders.length,
    byStatus,
    recent: orders.slice(0, 12),
  });
}

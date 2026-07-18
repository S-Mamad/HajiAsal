import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import { getSellerOrders } from "@/lib/server/sellers";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "wallet.view");
  if (!gated.ok) return gated.response;

  const orders = await getSellerOrders(gated.ctx.seller.id);
  const active = orders.filter((o) => o.status !== "cancelled");
  const byStatus: Record<string, number> = {};
  for (const o of active) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + o.sellerSubtotal;
  }
  const last30 = Date.now() - 30 * 86400000;
  const recent = active
    .filter((o) => new Date(o.createdAt).getTime() >= last30)
    .reduce((s, o) => s + o.sellerSubtotal, 0);

  return NextResponse.json({
    total: active.reduce((s, o) => s + o.sellerSubtotal, 0),
    recent30d: recent,
    byStatus,
    orderCount: active.length,
  });
}

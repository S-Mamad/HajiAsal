import { NextResponse } from "next/server";
import {
  buildSellerDashboard,
  toPublicSeller,
} from "@/lib/server/sellers";
import { gateSeller } from "@/lib/server/seller-gate";
import { canSeller } from "@/lib/seller/capabilities";

export async function GET(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const seller = gated.ctx.seller;
  const caps = seller.capabilities;
  const includeWallet = canSeller(caps, "wallet.view");
  const includeOrders = canSeller(caps, "orders.manage");
  const includeProducts =
    canSeller(caps, "products.manage") || canSeller(caps, "inventory.manage");
  const includeTickets = canSeller(caps, "tickets.manage");
  const includeRevenue =
    canSeller(caps, "reports.view") || canSeller(caps, "orders.manage");

  const data = await buildSellerDashboard(seller.id, {
    lowStockThreshold: seller.shopSettings?.lowStockThreshold ?? 10,
    includeWallet,
    includeOrders,
    includeProducts,
    includeTickets,
    includeRevenue,
  });

  return NextResponse.json({
    seller: toPublicSeller(seller),
    capabilities: seller.capabilities ?? null,
    ...data,
  });
}

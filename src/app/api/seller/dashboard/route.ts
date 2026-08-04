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
  const includeWallet = canSeller(seller.capabilities, "wallet.view");
  const data = await buildSellerDashboard(seller.id, {
    lowStockThreshold: seller.shopSettings?.lowStockThreshold ?? 10,
    includeWallet,
  });

  return NextResponse.json({
    seller: toPublicSeller(seller),
    capabilities: seller.capabilities ?? null,
    ...data,
  });
}

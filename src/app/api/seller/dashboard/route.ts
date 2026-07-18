import { NextResponse } from "next/server";
import {
  buildSellerDashboard,
  toPublicSeller,
} from "@/lib/server/sellers";
import { gateSeller } from "@/lib/server/seller-gate";

export async function GET(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const data = await buildSellerDashboard(gated.ctx.seller.id);
  return NextResponse.json({
    seller: toPublicSeller(gated.ctx.seller),
    ...data,
  });
}

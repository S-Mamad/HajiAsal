import { NextResponse } from "next/server";
import { gateSeller } from "@/lib/server/seller-gate";
import { listSellerActivity } from "@/lib/server/seller-activity";

export async function GET(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 25);
  const offset = Number(searchParams.get("offset") ?? 0);
  const action = searchParams.get("action") ?? undefined;

  const data = await listSellerActivity({
    sellerId: gated.ctx.seller.id,
    limit,
    offset,
    action: action || undefined,
  });
  return NextResponse.json(data);
}

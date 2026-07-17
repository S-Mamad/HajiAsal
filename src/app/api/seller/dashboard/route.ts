import { NextResponse } from "next/server";
import {
  buildSellerDashboard,
  getSellerFromRequest,
  toPublicSeller,
} from "@/lib/server/sellers";

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const data = await buildSellerDashboard(seller.id);
  return NextResponse.json({
    seller: toPublicSeller(seller),
    ...data,
  });
}

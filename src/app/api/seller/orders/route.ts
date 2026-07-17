import { NextResponse } from "next/server";
import {
  getSellerFromRequest,
  getSellerOrders,
} from "@/lib/server/sellers";

export async function GET(request: Request) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const orders = await getSellerOrders(seller.id);
  return NextResponse.json({ orders });
}

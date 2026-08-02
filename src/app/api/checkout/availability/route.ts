import { NextResponse } from "next/server";
import { isSnappayConfigured } from "@/lib/server/snappay";

export async function GET() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  return NextResponse.json({
    zarinpal: Boolean(merchantId && merchantId !== "your_merchant_id"),
    snappay: isSnappayConfigured(),
  });
}

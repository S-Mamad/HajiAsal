import { NextResponse } from "next/server";

export async function GET() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID;
  return NextResponse.json({
    zarinpal: Boolean(
      merchantId && merchantId !== "your_merchant_id",
    ),
  });
}

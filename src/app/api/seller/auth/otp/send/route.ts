import { NextResponse } from "next/server";
import { handlePanelOtpSend } from "@/lib/auth/panel-otp";
import { getSellerByPhoneAsync } from "@/lib/server/sellers";
import { normalizePhone } from "@/lib/auth/phone";

export async function POST(request: Request) {
  return handlePanelOtpSend(request, "seller", async (phone) => {
    const seller = await getSellerByPhoneAsync(phone);
    if (!seller || seller.status !== "active") return false;
    const sellerPhone = normalizePhone(seller.phone);
    return sellerPhone === phone;
  });
}

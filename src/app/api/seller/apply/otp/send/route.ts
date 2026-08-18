import { NextResponse } from "next/server";
import { handlePanelOtpSend } from "@/lib/auth/panel-otp";
import { isTrustedMutationOrigin } from "@/lib/auth/request-origin";
import { isValidIranPhone, normalizePhone } from "@/lib/auth/phone";
import { getSellerByPhoneAsync } from "@/lib/server/sellers";
import { sellerPublicUrl } from "@/lib/paths";
import { otpSendSchema } from "@/lib/auth/validations/auth";
import {
  checkRateLimitAsync,
  getClientIp,
} from "@/lib/server/rate-limit";

/** Block OTP for phones already registered as sellers; otherwise send apply OTP. */
export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "درخواست نامعتبر است" },
      { status: 403 },
    );
  }

  const ip = getClientIp(request);
  const ipFlood = await checkRateLimitAsync(
    `seller-apply-exists:ip:${ip}`,
    30,
    60 * 60 * 1000,
  );
  if (!ipFlood.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
      },
      { status: 429 },
    );
  }

  const clone = request.clone();
  try {
    const body = await clone.json().catch(() => null);
    const parsed = otpSendSchema.safeParse(body);
    if (parsed.success) {
      const phone = normalizePhone(parsed.data.phone);
      if (phone && isValidIranPhone(phone)) {
        const existing = await getSellerByPhoneAsync(phone);
        if (existing) {
          return NextResponse.json(
            {
              success: false,
              code: "SELLER_EXISTS",
              message: "این شماره از قبل وجود دارد",
              sellerLoginUrl: `${sellerPublicUrl()}/seller`,
            },
            { status: 409 },
          );
        }
      }
    }
  } catch {
    /* fall through */
  }

  return handlePanelOtpSend(request, "seller_apply", async (phone) =>
    isValidIranPhone(phone),
  );
}

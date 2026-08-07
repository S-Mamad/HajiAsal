import { NextResponse } from "next/server";
import { handlePanelOtpVerify } from "@/lib/auth/panel-otp";
import {
  createSellerApplyToken,
  sellerApplyCookieOptions,
} from "@/lib/server/seller-apply-session";
import { getSellerByPhoneAsync } from "@/lib/server/sellers";
import { getPendingApplicationByPhoneAsync } from "@/lib/server/seller-applications-store";
import { maskPhone } from "@/lib/auth/phone-mask";

export async function POST(request: Request) {
  try {
    const verified = await handlePanelOtpVerify(request, "seller_apply");
    if (!verified.ok) return verified.response;

    const existingSeller = await getSellerByPhoneAsync(verified.phone);
    if (existingSeller) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingSeller.status === "active"
              ? "این شماره قبلاً به‌عنوان فروشنده ثبت شده است. از صفحه ورود فروشنده وارد شوید."
              : "این شماره قبلاً در سیستم فروشندگان ثبت شده است. با پشتیبانی تماس بگیرید.",
        },
        { status: 409 },
      );
    }

    const pending = await getPendingApplicationByPhoneAsync(verified.phone);
    if (pending) {
      return NextResponse.json(
        {
          success: false,
          message: "برای این شماره یک درخواست در انتظار بررسی وجود دارد.",
        },
        { status: 409 },
      );
    }

    const token = createSellerApplyToken(verified.phone);
    const cookie = sellerApplyCookieOptions(token);
    const response = NextResponse.json({
      success: true,
      phone: verified.phone,
      maskedPhone: maskPhone(verified.phone),
    });
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}

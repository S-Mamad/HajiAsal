import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { otpSendSchema } from "@/lib/auth/validations/auth";
import {
  createOtpChallenge,
  discardOtpChallenge,
  peekSendRateLimit,
  recordSuccessfulSend,
} from "@/lib/auth/otp-store";
import {
  getOtpProviderForPhone,
  getTestOtpProvider,
  isTestOtpAllowed,
} from "@/lib/auth/get-otp-provider";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`otp-send:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { success: false, message: "تعداد درخواست‌ها زیاد است" },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.retryAfterSec) },
        },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "درخواست نامعتبر است" },
        { status: 400 },
      );
    }

    const parsed = otpSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "شماره موبایل نامعتبر است" },
        { status: 400 },
      );
    }

    const phone = normalizePhone(parsed.data.phone)!;
    const rate = peekSendRateLimit(phone);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, message: rate.message },
        {
          status: 429,
          headers: rate.retryAfterSec
            ? { "Retry-After": String(rate.retryAfterSec) }
            : undefined,
        },
      );
    }

    const testProvider = getTestOtpProvider();
    const provider = getOtpProviderForPhone(phone);
    const isTestPhone =
      isTestOtpAllowed() && testProvider.isTestPhone(phone);

    let storedCode: string;
    let sendMessage = "کد تأیید ارسال شد";

    if (isTestPhone) {
      storedCode = await createOtpChallenge(phone, testProvider.getTestOtp());
      const result = await provider.send(phone, storedCode);
      if (!result.success) {
        await discardOtpChallenge(phone);
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 },
        );
      }
      sendMessage = result.message;
    } else if (provider.generatesOwnCode) {
      // Melipayamak (and similar): gateway creates the OTP.
      const result = await provider.send(phone, "");
      if (!result.success || !result.code) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 },
        );
      }
      try {
        storedCode = await createOtpChallenge(phone, result.code);
      } catch {
        return NextResponse.json(
          { success: false, message: "خطا در ذخیره کد تأیید" },
          { status: 500 },
        );
      }
      sendMessage = result.message;
    } else {
      // Kavenegar / Ghasedak: we generate, then SMS the code.
      storedCode = await createOtpChallenge(phone);
      const result = await provider.send(phone, storedCode);
      if (!result.success) {
        await discardOtpChallenge(phone);
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 },
        );
      }
      sendMessage = result.message;
    }

    recordSuccessfulSend(phone);

    return NextResponse.json({
      success: true,
      message: sendMessage,
      codeLength: storedCode.length,
      expiresInSec: 5 * 60,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در ارسال کد" },
      { status: 500 },
    );
  }
}

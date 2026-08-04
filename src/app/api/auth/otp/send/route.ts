import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { otpSendSchema } from "@/lib/auth/validations/auth";
import { parseDeviceIdFromRequest } from "@/lib/auth/device-id";
import {
  createOtpChallenge,
  discardOtpChallenge,
} from "@/lib/auth/otp-store";
import {
  getOtpProviderForPhone,
  getTestOtpProvider,
  isTestOtpAllowed,
} from "@/lib/auth/get-otp-provider";
import {
  checkRateLimitAsync,
  getClientIp,
  peekRateLimitAsync,
  recordRateLimitHitAsync,
} from "@/lib/server/rate-limit";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Short windows + hard daily caps (phone / IP / device).
 * Daily caps are the main “per user per day” answer.
 */
const LIMITS = {
  /** Burst: any /otp/send attempts from same IP */
  ipBurstMax: envInt("AUTH_OTP_IP_MAX", 3),
  ipBurstWindowMs: 15 * 60 * 1000,
  /** Successful SMS short window per phone */
  phoneBurstMax: envInt("AUTH_OTP_PHONE_MAX", 2),
  phoneBurstWindowMs: 20 * 60 * 1000,
  cooldownSec: envInt("AUTH_OTP_COOLDOWN_SEC", 120),
  globalHourly: envInt("AUTH_OTP_GLOBAL_HOURLY", 25),

  /** === Daily caps (successful SMS unless noted) === */
  phoneDaily: envInt("AUTH_OTP_PHONE_DAILY", 5),
  ipDaily: envInt("AUTH_OTP_IP_DAILY", 8),
  deviceDaily: envInt("AUTH_OTP_DEVICE_DAILY", 5),
  /** Unknown/missing device is stricter */
  unknownDeviceDaily: envInt("AUTH_OTP_UNKNOWN_DEVICE_DAILY", 2),
};

function tooMany(message: string, retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { success: false, message },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSec)) },
    },
  );
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // 1) Burst flood on IP (every attempt).
    const ipFlood = await checkRateLimitAsync(
      `otp-send:ip:${ip}`,
      LIMITS.ipBurstMax,
      LIMITS.ipBurstWindowMs,
    );
    if (!ipFlood.ok) {
      return tooMany(
        "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
        ipFlood.retryAfterSec,
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
    const deviceId = parseDeviceIdFromRequest(request, parsed.data.deviceId);

    const cooldownMs = LIMITS.cooldownSec * 1000;
    const globalMs = 60 * 60 * 1000;

    const cooldownKey = `otp-send:cooldown:${phone}`;
    const phoneBurstKey = `otp-send:phone:${phone}`;
    const phoneDayKey = `otp-send:day:phone:${phone}`;
    const ipDayKey = `otp-send:day:ip:${ip}`;
    const deviceDayKey = `otp-send:day:device:${deviceId}`;
    const globalKey = "otp-send:global";

    const deviceDailyCap =
      deviceId === "unknown" ? LIMITS.unknownDeviceDaily : LIMITS.deviceDaily;

    // 2) Peek all SMS budgets (consume only after successful send).
    const checks: Array<{
      key: string;
      limit: number;
      windowMs: number;
      message: string;
    }> = [
      {
        key: cooldownKey,
        limit: 1,
        windowMs: cooldownMs,
        message: `لطفاً ${LIMITS.cooldownSec} ثانیه صبر کنید و دوباره درخواست دهید`,
      },
      {
        key: phoneBurstKey,
        limit: LIMITS.phoneBurstMax,
        windowMs: LIMITS.phoneBurstWindowMs,
        message: "برای این شماره بیش از حد کد درخواست شده. کمی بعد تلاش کنید.",
      },
      {
        key: phoneDayKey,
        limit: LIMITS.phoneDaily,
        windowMs: DAY_MS,
        message: `سقف روزانه این شماره پر شده است (حداکثر ${LIMITS.phoneDaily} پیامک در روز).`,
      },
      {
        key: ipDayKey,
        limit: LIMITS.ipDaily,
        windowMs: DAY_MS,
        message: `سقف روزانه این اینترنت پر شده است (حداکثر ${LIMITS.ipDaily} پیامک در روز).`,
      },
      {
        key: deviceDayKey,
        limit: deviceDailyCap,
        windowMs: DAY_MS,
        message: `سقف روزانه این دستگاه پر شده است (حداکثر ${deviceDailyCap} پیامک در روز).`,
      },
      {
        key: globalKey,
        limit: LIMITS.globalHourly,
        windowMs: globalMs,
        message: "ظرفیت ارسال کد موقتاً پر است. لطفاً بعداً تلاش کنید.",
      },
    ];

    const peekResults = await Promise.all(
      checks.map(async (check) => ({
        check,
        result: await peekRateLimitAsync(
          check.key,
          check.limit,
          check.windowMs,
        ),
      })),
    );
    for (const { check, result } of peekResults) {
      if (!result.ok) {
        return tooMany(check.message, result.retryAfterSec);
      }
    }

    const testProvider = getTestOtpProvider();
    const provider = getOtpProviderForPhone(phone);
    const isTestPhone =
      isTestOtpAllowed() && testProvider.isTestPhone(phone);

    let storedCode: string;
    let sendMessage = "کد تأیید ارسال شد";
    let smsSent = false;

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
      smsSent = true;
    } else if (provider.generatesOwnCode) {
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
      smsSent = true;
    } else {
      storedCode = await createOtpChallenge(phone);
      const result = await provider.send(phone, storedCode);
      if (!result.success) {
        await discardOtpChallenge(phone);
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 },
        );
      }
      if (result.code && result.code !== storedCode) {
        try {
          storedCode = await createOtpChallenge(phone, result.code);
        } catch {
          await discardOtpChallenge(phone);
          return NextResponse.json(
            { success: false, message: "خطا در ذخیره کد تأیید" },
            { status: 500 },
          );
        }
      }
      sendMessage = result.message;
      smsSent = true;
    }

    // Do not block the HTTP response on rate-limit writes (SMS already accepted).
    if (smsSent) {
      void Promise.all([
        recordRateLimitHitAsync(cooldownKey, cooldownMs),
        recordRateLimitHitAsync(phoneBurstKey, LIMITS.phoneBurstWindowMs),
        recordRateLimitHitAsync(phoneDayKey, DAY_MS),
        recordRateLimitHitAsync(ipDayKey, DAY_MS),
        recordRateLimitHitAsync(deviceDayKey, DAY_MS),
        recordRateLimitHitAsync(globalKey, globalMs),
      ]).catch((err) => {
        console.error(
          "[otp/send] rate-limit record",
          err instanceof Error ? err.message : err,
        );
      });
    }

    return NextResponse.json({
      success: true,
      message: sendMessage,
      codeLength: storedCode!.length,
      expiresInSec: 10 * 60,
      resendAfterSec: LIMITS.cooldownSec,
      limits: {
        phoneDaily: LIMITS.phoneDaily,
        ipDaily: LIMITS.ipDaily,
        deviceDaily: deviceDailyCap,
      },
    });
  } catch (error) {
    console.error(
      "[otp/send]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, message: "خطا در ارسال کد" },
      { status: 500 },
    );
  }
}

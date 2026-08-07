import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/auth/phone";
import { otpSendSchema, otpVerifySchema } from "@/lib/auth/validations/auth";
import { parseDeviceIdFromRequest } from "@/lib/auth/device-id";
import {
  createOtpChallenge,
  discardOtpChallenge,
  OTP_LENGTH,
  verifyOtpChallenge,
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

export type PanelOtpAudience = "admin" | "seller" | "seller_apply";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Ghost delay approximates Melipayamak RTT so timing does not enumerate phones. */
const GHOST_DELAY_MS = envInt("AUTH_PANEL_OTP_GHOST_MS", 900);
const DEFAULT_COOLDOWN = envInt("AUTH_OTP_COOLDOWN_SEC", 120);

const LIMITS = {
  ipBurstMax: envInt("AUTH_OTP_IP_MAX", 3),
  ipBurstWindowMs: 15 * 60 * 1000,
  phoneBurstMax: envInt("AUTH_OTP_PHONE_MAX", 2),
  phoneBurstWindowMs: 20 * 60 * 1000,
  cooldownSec: DEFAULT_COOLDOWN,
  globalHourly: envInt("AUTH_OTP_GLOBAL_HOURLY", 25),
  phoneDaily: envInt("AUTH_OTP_PHONE_DAILY", 5),
  ipDaily: envInt("AUTH_OTP_IP_DAILY", 8),
  deviceDaily: envInt("AUTH_OTP_DEVICE_DAILY", 5),
  unknownDeviceDaily: envInt("AUTH_OTP_UNKNOWN_DEVICE_DAILY", 2),
};

function challengeKey(audience: PanelOtpAudience, phone: string): string {
  return `panel:${audience}:${phone}`;
}

function tooMany(message: string, retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { success: false, message },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSec)) },
    },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function successSendBody(opts?: {
  message?: string;
  codeLength?: number;
  resendAfterSec?: number;
}) {
  return {
    success: true as const,
    message: opts?.message ?? "کد تأیید ارسال شد",
    codeLength: opts?.codeLength ?? OTP_LENGTH,
    expiresInSec: 10 * 60,
    resendAfterSec: opts?.resendAfterSec ?? LIMITS.cooldownSec,
    limits: {
      phoneDaily: LIMITS.phoneDaily,
      ipDaily: LIMITS.ipDaily,
      deviceDaily: LIMITS.deviceDaily,
    },
  };
}

/**
 * Send OTP for admin/seller panels.
 * Unauthorized phones get a fake success (no SMS, no challenge).
 */
export async function handlePanelOtpSend(
  request: Request,
  audience: PanelOtpAudience,
  isAllowedPhone: (phone: string) => Promise<boolean>,
): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);

    const ipFlood = await checkRateLimitAsync(
      `panel-otp-send:ip:${ip}`,
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
    const key = challengeKey(audience, phone);

    const cooldownMs = LIMITS.cooldownSec * 1000;
    const globalMs = 60 * 60 * 1000;
    const cooldownKey = `panel-otp-send:cooldown:${audience}:${phone}`;
    const phoneBurstKey = `panel-otp-send:phone:${audience}:${phone}`;
    const phoneDayKey = `panel-otp-send:day:phone:${audience}:${phone}`;
    const ipDayKey = `panel-otp-send:day:ip:${ip}`;
    const deviceDayKey = `panel-otp-send:day:device:${deviceId}`;
    const globalKey = `panel-otp-send:global:${audience}`;

    const deviceDailyCap =
      deviceId === "unknown" ? LIMITS.unknownDeviceDaily : LIMITS.deviceDaily;

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

    const allowed = await isAllowedPhone(phone);
    if (!allowed) {
      // Consume budgets like a real send so enumeration is not free.
      void Promise.all([
        recordRateLimitHitAsync(cooldownKey, cooldownMs),
        recordRateLimitHitAsync(phoneBurstKey, LIMITS.phoneBurstWindowMs),
        recordRateLimitHitAsync(phoneDayKey, DAY_MS),
        recordRateLimitHitAsync(ipDayKey, DAY_MS),
        recordRateLimitHitAsync(deviceDayKey, DAY_MS),
        recordRateLimitHitAsync(globalKey, globalMs),
      ]).catch(() => undefined);
      await sleep(GHOST_DELAY_MS);
      return NextResponse.json(successSendBody());
    }

    const testProvider = getTestOtpProvider();
    const provider = getOtpProviderForPhone(phone);
    const isTestPhone =
      isTestOtpAllowed() && testProvider.isTestPhone(phone);

    let storedCode: string;
    let sendMessage = "کد تأیید ارسال شد";
    let smsSent = false;

    if (isTestPhone) {
      storedCode = await createOtpChallenge(key, testProvider.getTestOtp());
      const result = await provider.send(phone, storedCode);
      if (!result.success) {
        await discardOtpChallenge(key);
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
        storedCode = await createOtpChallenge(key, result.code);
      } catch {
        return NextResponse.json(
          { success: false, message: "خطا در ذخیره کد تأیید" },
          { status: 500 },
        );
      }
      sendMessage = result.message;
      smsSent = true;
    } else {
      storedCode = await createOtpChallenge(key);
      const result = await provider.send(phone, storedCode);
      if (!result.success) {
        await discardOtpChallenge(key);
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 },
        );
      }
      if (result.code && result.code !== storedCode) {
        try {
          storedCode = await createOtpChallenge(key, result.code);
        } catch {
          await discardOtpChallenge(key);
          return NextResponse.json(
            { success: false, message: "خطا در ذخیره کد تأیید" },
            { status: 500 },
          );
        }
      }
      sendMessage = result.message;
      smsSent = true;
    }

    // SMS already accepted by provider — do not stall the client on DB writes.
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
          `[panel-otp/${audience}/send] rate-limit record`,
          err instanceof Error ? err.message : err,
        );
      });
    }

    return NextResponse.json(
      successSendBody({
        message: sendMessage,
        codeLength: storedCode!.length,
      }),
    );
  } catch (error) {
    console.error(
      `[panel-otp/${audience}/send]`,
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, message: "خطا در ارسال کد" },
      { status: 500 },
    );
  }
}

export async function handlePanelOtpVerify(
  request: Request,
  audience: PanelOtpAudience,
): Promise<
  | { ok: true; phone: string }
  | { ok: false; response: NextResponse }
> {
  try {
    const ip = getClientIp(request);
    const limited = await checkRateLimitAsync(
      `panel-otp-verify:ip:${ip}`,
      10,
      15 * 60 * 1000,
    );
    if (!limited.ok) {
      return {
        ok: false,
        response: tooMany(
          "تعداد تلاش زیاد است. کمی بعد دوباره تلاش کنید.",
          limited.retryAfterSec,
        ),
      };
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "درخواست نامعتبر است" },
          { status: 400 },
        ),
      };
    }
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "اطلاعات نامعتبر است" },
          { status: 400 },
        ),
      };
    }

    const phone = normalizePhone(parsed.data.phone)!;
    const phoneLimited = await checkRateLimitAsync(
      `panel-otp-verify:phone:${audience}:${phone}`,
      5,
      15 * 60 * 1000,
    );
    if (!phoneLimited.ok) {
      return {
        ok: false,
        response: tooMany(
          "تعداد تلاش برای این شماره زیاد است.",
          phoneLimited.retryAfterSec,
        ),
      };
    }

    const key = challengeKey(audience, phone);
    const verify = await verifyOtpChallenge(key, parsed.data.code);
    if (!verify.valid) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "کد تأیید نادرست است" },
          { status: 400 },
        ),
      };
    }

    return { ok: true, phone };
  } catch (error) {
    console.error(
      `[panel-otp/${audience}/verify]`,
      error instanceof Error ? error.message : error,
    );
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "خطا در تأیید کد" },
        { status: 500 },
      ),
    };
  }
}

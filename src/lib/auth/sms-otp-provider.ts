import type { OtpProvider, OtpSendResult } from "./otp-provider";
import { MIN_OTP_LENGTH, MAX_OTP_LENGTH } from "./otp-store";

type SmsProvider = "melipayamak" | "kavenegar" | "ghasedak";

function getProvider(): SmsProvider {
  const p = process.env.SMS_PROVIDER?.toLowerCase().trim();
  if (p === "melipayamak" || p === "meli" || p === "meli-payamak") {
    return "melipayamak";
  }
  if (p === "ghasedak") return "ghasedak";
  return "kavenegar";
}

function getMelipayamakOtpUrl(): string | null {
  const full = process.env.MELIPAYAMAK_OTP_URL?.trim();
  if (full) return full.replace(/\/$/, "");

  const token =
    process.env.MELIPAYAMAK_OTP_TOKEN?.trim() ||
    process.env.SMS_API_KEY?.trim();
  if (!token) return null;
  return `https://console.melipayamak.com/api/send/otp/${token}`;
}

function extractMelipayamakCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const raw = record.code ?? record.Code ?? record.otp ?? record.OTP;
  if (raw === undefined || raw === null) return null;
  const digits = String(raw).replace(/\D/g, "");
  // Accept whatever length the Melipayamak console OTP is configured to send.
  if (digits.length < MIN_OTP_LENGTH || digits.length > MAX_OTP_LENGTH) {
    return null;
  }
  return digits;
}

function isMelipayamakSuccess(
  httpOk: boolean,
  data: Record<string, unknown>,
  code: string | null,
): boolean {
  if (!code) return false;
  if (!httpOk) return false;
  const status = String(data.status ?? data.Status ?? "").trim();
  if (!status) return true;
  const failHints = [
    "نامعتبر",
    "خطا",
    "نمی باشد",
    "نمیباشد",
    "محدودیت",
    "مسدود",
    "مستلزم",
    "کافی",
    "اشتباه",
  ];
  if (failHints.some((h) => status.includes(h))) return false;
  return true;
}

/**
 * Melipayamak Console OTP: gateway generates the code.
 * Docs: POST { to } → { code, status }
 */
async function sendViaMelipayamak(phone: string): Promise<OtpSendResult> {
  const url = getMelipayamakOtpUrl();
  if (!url) {
    return {
      success: false,
      message: "سرویس پیامک پیکربندی نشده است",
    };
  }

  const receptor = phone.replace(/\D/g, "");
  let res: Response;
  let data: Record<string, unknown> = {};

  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: receptor }),
      signal: AbortSignal.timeout(15_000),
    });
    data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }

  const code = extractMelipayamakCode(data);
  if (!isMelipayamakSuccess(res.ok, data, code)) {
    const statusMsg = String(data.status ?? data.Status ?? "").trim();
    if (statusMsg.includes("مستلزم") || statusMsg.includes("تأیید مدیر")) {
      return {
        success: false,
        message:
          "ارسال OTP در پنل ملی‌پیامک هنوز تأیید نشده است. از پشتیبانی ملی‌پیامک پیگیری کنید.",
      };
    }
    if (statusMsg.includes("اعتبار") || statusMsg.includes("کافی")) {
      return {
        success: false,
        message: "اعتبار پنل پیامک کافی نیست",
      };
    }
    // Gateway sent SMS but returned unexpected digit length.
    if (res.ok && !code && (data.code !== undefined || data.Code !== undefined)) {
      return {
        success: false,
        message: `طول کد دریافتی از پنل پیامک باید بین ${MIN_OTP_LENGTH} تا ${MAX_OTP_LENGTH} رقم باشد. طول OTP را در کنسول ملی‌پیامک تنظیم کنید.`,
      };
    }
    if (process.env.NODE_ENV !== "production" && statusMsg) {
      console.error("[melipayamak-otp]", res.status, statusMsg, data);
    }
    return {
      success: false,
      message: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید",
    };
  }

  return {
    success: true,
    message: "کد تأیید ارسال شد",
    code: code!,
  };
}

async function sendViaKavenegar(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const apiKey = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER;
  if (!apiKey || !sender) {
    return {
      success: false,
      message: "سرویس پیامک پیکربندی نشده است",
    };
  }

  const receptor = phone.replace(/\D/g, "");
  const message = `کد تأیید حاجی عسل: ${code}`;
  const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;

  const body = new URLSearchParams({
    receptor,
    sender,
    message,
  });

  let res: Response;
  let data: { return?: { status?: number } } = {};
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    data = (await res.json().catch(() => ({}))) as typeof data;
  } catch {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }

  if (!res.ok || data.return?.status !== 200) {
    return {
      success: false,
      message: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید",
    };
  }

  return { success: true, message: "کد تأیید ارسال شد" };
}

async function sendViaGhasedak(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const apiKey = process.env.SMS_API_KEY;
  const sender = process.env.SMS_SENDER;
  if (!apiKey || !sender) {
    return {
      success: false,
      message: "سرویس پیامک پیکربندی نشده است",
    };
  }

  let res: Response;
  try {
    res = await fetch("https://api.ghasedak.me/v2/sms/send/simple", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: apiKey,
      },
      body: new URLSearchParams({
        message: `کد تأیید حاجی عسل: ${code}`,
        receptor: phone.replace(/\D/g, ""),
        linenumber: sender,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }

  if (!res.ok) {
    return {
      success: false,
      message: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید",
    };
  }

  return { success: true, message: "کد تأیید ارسال شد" };
}

export class SmsOtpProvider implements OtpProvider {
  readonly name = "sms";

  get generatesOwnCode(): boolean {
    return getProvider() === "melipayamak";
  }

  canSendTo(_phone: string): boolean {
    if (getProvider() === "melipayamak") {
      return Boolean(getMelipayamakOtpUrl());
    }
    return Boolean(process.env.SMS_API_KEY && process.env.SMS_SENDER);
  }

  async send(phone: string, code: string): Promise<OtpSendResult> {
    if (!this.canSendTo(phone)) {
      return {
        success: false,
        message:
          "سرویس پیامک فعال نیست. از شماره تست در محیط توسعه استفاده کنید.",
      };
    }

    const provider = getProvider();
    if (provider === "melipayamak") {
      return sendViaMelipayamak(phone);
    }
    if (provider === "ghasedak") {
      return sendViaGhasedak(phone, code);
    }
    return sendViaKavenegar(phone, code);
  }
}

/** Exported for unit tests */
export const __melipayamakTestUtils = {
  extractMelipayamakCode,
  isMelipayamakSuccess,
  getMelipayamakOtpUrl,
};

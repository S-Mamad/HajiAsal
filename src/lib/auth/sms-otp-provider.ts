import type { OtpProvider, OtpSendResult } from "./otp-provider";
import { MIN_OTP_LENGTH, MAX_OTP_LENGTH } from "./otp-store";

type SmsProvider = "melipayamak" | "kavenegar" | "ghasedak";

/** Tight timeout: pattern OTP APIs reply in well under a second. */
const FETCH_MS = 3_000;

function getProvider(): SmsProvider {
  const p = process.env.SMS_PROVIDER?.toLowerCase().trim();
  if (p === "melipayamak" || p === "meli" || p === "meli-payamak") {
    return "melipayamak";
  }
  if (p === "ghasedak") return "ghasedak";
  return "kavenegar";
}

function getMelipayamakToken(): string | null {
  return (
    process.env.MELIPAYAMAK_OTP_TOKEN?.trim() ||
    process.env.SMS_API_KEY?.trim() ||
    null
  );
}

function getMelipayamakOtpUrl(): string | null {
  const full = process.env.MELIPAYAMAK_OTP_URL?.trim();
  if (full) return full.replace(/\/$/, "");
  const token = getMelipayamakToken();
  if (!token) return null;
  return `https://console.melipayamak.com/api/send/otp/${token}`;
}

/**
 * Shared-pattern (سرویس مشترک) — fastest Iranian OTP delivery.
 * Needs a verified bodyId (pattern) in Melipayamak panel.
 */
function getMelipayamakSharedUrl(): string | null {
  const full = process.env.MELIPAYAMAK_SHARED_URL?.trim();
  if (full) return full.replace(/\/$/, "");
  const token =
    process.env.MELIPAYAMAK_SHARED_TOKEN?.trim() || getMelipayamakToken();
  if (!token) return null;
  if (!getMelipayamakBodyId()) return null;
  const otpUrl = process.env.MELIPAYAMAK_OTP_URL?.trim();
  if (otpUrl) {
    const swapped = otpUrl.replace(/\/otp\//i, "/shared/");
    if (swapped !== otpUrl) return swapped.replace(/\/$/, "");
  }
  return `https://console.melipayamak.com/api/send/shared/${token}`;
}

function getMelipayamakBodyId(): number | null {
  const raw =
    process.env.MELIPAYAMAK_BODY_ID?.trim() ||
    process.env.MELIPAYAMAK_PATTERN_ID?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/** Free-text simple — often delayed by operator filters; last resort only. */
function getMelipayamakSimpleUrl(): string | null {
  const full = process.env.MELIPAYAMAK_SIMPLE_URL?.trim();
  if (full) return full.replace(/\/$/, "");
  const token = getMelipayamakToken();
  if (!token) return null;
  const otpUrl = process.env.MELIPAYAMAK_OTP_URL?.trim();
  if (otpUrl) {
    const swapped = otpUrl.replace(/\/otp\//i, "/simple/");
    if (swapped !== otpUrl) return swapped.replace(/\/$/, "");
  }
  return `https://console.melipayamak.com/api/send/simple/${token}`;
}

function preferSimpleOverGateway(): boolean {
  const raw = process.env.MELIPAYAMAK_PREFER_SIMPLE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function extractMelipayamakCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const raw = record.code ?? record.Code ?? record.otp ?? record.OTP;
  if (raw === undefined || raw === null) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < MIN_OTP_LENGTH || digits.length > MAX_OTP_LENGTH) {
    return null;
  }
  return digits;
}

function isMelipayamakSuccess(
  httpOk: boolean,
  data: Record<string, unknown>,
  requireCode: boolean,
): boolean {
  if (!httpOk) return false;
  if (requireCode && !extractMelipayamakCode(data)) return false;
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

function melipayamakErrorMessage(data: Record<string, unknown>): string {
  const statusMsg = String(data.status ?? data.Status ?? "").trim();
  if (statusMsg.includes("مستلزم") || statusMsg.includes("تأیید مدیر")) {
    return "ارسال OTP در پنل ملی‌پیامک هنوز تأیید نشده است. از پشتیبانی ملی‌پیامک پیگیری کنید.";
  }
  if (statusMsg.includes("اعتبار") || statusMsg.includes("کافی")) {
    return "اعتبار پنل پیامک کافی نیست";
  }
  return "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید";
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
  timeoutMs = FETCH_MS,
): Promise<{ res: Response; data: Record<string, unknown> } | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, data };
  } catch {
    return null;
  }
}

/** Shared pattern with OUR code — fastest path when bodyId is configured. */
async function sendViaMelipayamakShared(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const url = getMelipayamakSharedUrl();
  const bodyId = getMelipayamakBodyId();
  if (!url || !bodyId) {
    return { success: false, message: "سرویس پیامک پیکربندی نشده است" };
  }

  const posted = await postJson(url, {
    to: phone.replace(/\D/g, ""),
    bodyId,
    args: [code],
  });
  if (!posted) {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }
  const { res, data } = posted;
  if (!isMelipayamakSuccess(res.ok, data, false)) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[melipayamak-shared]", res.status, data);
    }
    return { success: false, message: melipayamakErrorMessage(data) };
  }
  return { success: true, message: "کد تأیید ارسال شد" };
}

/**
 * Also supports classic REST BaseServiceNumber when username/password are set
 * (same shared pattern, often even more reliable on some panels).
 */
async function sendViaMelipayamakBaseService(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const username = process.env.MELIPAYAMAK_USERNAME?.trim();
  const password = process.env.MELIPAYAMAK_PASSWORD?.trim();
  const bodyId = getMelipayamakBodyId();
  if (!username || !password || !bodyId) {
    return { success: false, message: "سرویس پیامک پیکربندی نشده است" };
  }

  const posted = await postJson(
    "https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber",
    {
      username,
      password,
      to: phone.replace(/\D/g, ""),
      bodyId: String(bodyId),
      text: code,
    },
  );
  if (!posted) {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }
  const { res, data } = posted;
  const value = data.Value ?? data.value ?? data.retStr ?? data.StrRetStatus;
  const okNum =
    typeof value === "number"
      ? value > 20
      : typeof value === "string" && /^\d{5,}$/.test(value.trim());
  if (!res.ok || (!okNum && !isMelipayamakSuccess(res.ok, data, false))) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[melipayamak-base]", res.status, data);
    }
    return { success: false, message: melipayamakErrorMessage(data) };
  }
  return { success: true, message: "کد تأیید ارسال شد" };
}

async function sendViaMelipayamakSimple(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const url = getMelipayamakSimpleUrl();
  if (!url) {
    return { success: false, message: "سرویس پیامک پیکربندی نشده است" };
  }

  const posted = await postJson(url, {
    to: phone.replace(/\D/g, ""),
    text: `حاجی عسل\nکد تأیید: ${code}`,
  });
  if (!posted) {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }
  const { res, data } = posted;
  if (!isMelipayamakSuccess(res.ok, data, false)) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[melipayamak-simple]", res.status, data);
    }
    return { success: false, message: melipayamakErrorMessage(data) };
  }

  return { success: true, message: "کد تأیید ارسال شد" };
}

/** Melipayamak Console OTP: dedicated OTP lane (gateway generates the code). */
async function sendViaMelipayamakGateway(phone: string): Promise<OtpSendResult> {
  const url = getMelipayamakOtpUrl();
  if (!url) {
    return {
      success: false,
      message: "سرویس پیامک پیکربندی نشده است",
    };
  }

  const posted = await postJson(
    url,
    { to: phone.replace(/\D/g, "") },
    FETCH_MS,
  );
  if (!posted) {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }
  const { res, data } = posted;

  const code = extractMelipayamakCode(data);
  if (!isMelipayamakSuccess(res.ok, data, true) || !code) {
    if (res.ok && !code && (data.code !== undefined || data.Code !== undefined)) {
      return {
        success: false,
        message: `طول کد دریافتی از پنل پیامک باید بین ${MIN_OTP_LENGTH} تا ${MAX_OTP_LENGTH} رقم باشد. طول OTP را در کنسول ملی‌پیامک تنظیم کنید.`,
      };
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[melipayamak-otp]", res.status, data);
    }
    return { success: false, message: melipayamakErrorMessage(data) };
  }

  return {
    success: true,
    message: "کد تأیید ارسال شد",
    code,
  };
}

function hasSharedChannel(): boolean {
  return Boolean(getMelipayamakBodyId());
}

/**
 * Fastest Melipayamak path only — never chain slow fallbacks:
 * 1) console shared/pattern with OUR code (instant operator lane)
 * 2) REST BaseServiceNumber (same pattern, same code) if console shared fails
 * 3) console OTP gateway when no bodyId is configured
 * Free-text simple is opt-in only (MELIPAYAMAK_PREFER_SIMPLE) — operators delay it.
 */
async function sendViaMelipayamak(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  if (hasSharedChannel() && code) {
    if (getMelipayamakSharedUrl()) {
      const shared = await sendViaMelipayamakShared(phone, code);
      if (shared.success) return shared;
    }
    const username = process.env.MELIPAYAMAK_USERNAME?.trim();
    const password = process.env.MELIPAYAMAK_PASSWORD?.trim();
    if (username && password) {
      const base = await sendViaMelipayamakBaseService(phone, code);
      if (base.success) return base;
    }
    // Pattern was configured: do not send a second slow/different-code SMS.
    return {
      success: false,
      message: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید",
    };
  }

  const otpUrl = getMelipayamakOtpUrl();
  const simpleUrl = getMelipayamakSimpleUrl();

  if (preferSimpleOverGateway() && simpleUrl && code) {
    const simple = await sendViaMelipayamakSimple(phone, code);
    if (simple.success) return simple;
    if (otpUrl) {
      const gateway = await sendViaMelipayamakGateway(phone);
      if (gateway.success) return gateway;
    }
    return simple;
  }

  if (otpUrl) {
    const gateway = await sendViaMelipayamakGateway(phone);
    if (gateway.success) return gateway;
    return gateway;
  }

  if (simpleUrl && code) {
    return sendViaMelipayamakSimple(phone, code);
  }

  return {
    success: false,
    message: "سرویس پیامک پیکربندی نشده است",
  };
}

function getKavenegarTemplate(): string | null {
  return (
    process.env.KAVENEGAR_OTP_TEMPLATE?.trim() ||
    process.env.SMS_OTP_TEMPLATE?.trim() ||
    null
  );
}

async function sendViaKavenegarLookup(
  phone: string,
  code: string,
  apiKey: string,
  template: string,
): Promise<OtpSendResult> {
  const body = new URLSearchParams({
    receptor: phone.replace(/\D/g, ""),
    token: code,
    template,
  });
  try {
    const res = await fetch(
      `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(FETCH_MS),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      return?: { status?: number };
    };
    if (!res.ok || data.return?.status !== 200) {
      return {
        success: false,
        message: "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید",
      };
    }
    return { success: true, message: "کد تأیید ارسال شد" };
  } catch {
    return {
      success: false,
      message: "ارتباط با سرویس پیامک برقرار نشد. دوباره تلاش کنید",
    };
  }
}

async function sendViaKavenegar(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      message: "سرویس پیامک پیکربندی نشده است",
    };
  }

  const template = getKavenegarTemplate();
  if (template) {
    const lookup = await sendViaKavenegarLookup(phone, code, apiKey, template);
    if (lookup.success) return lookup;
  }

  const sender = process.env.SMS_SENDER;
  if (!sender) {
    return {
      success: false,
      message: template
        ? "خطا در ارسال پیامک. لطفاً دوباره تلاش کنید"
        : "سرویس پیامک پیکربندی نشده است",
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
      signal: AbortSignal.timeout(FETCH_MS),
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

function getGhasedakTemplate(): string | null {
  return (
    process.env.GHASEDAK_OTP_TEMPLATE?.trim() ||
    process.env.SMS_OTP_TEMPLATE?.trim() ||
    null
  );
}

async function sendViaGhasedak(
  phone: string,
  code: string,
): Promise<OtpSendResult> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      message: "سرویس پیامک پیکربندی نشده است",
    };
  }

  const template = getGhasedakTemplate();
  if (template) {
    try {
      const res = await fetch(
        "https://api.ghasedak.me/v2/verification/send/simple",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            apikey: apiKey,
          },
          body: new URLSearchParams({
            receptor: phone.replace(/\D/g, ""),
            type: "1",
            template,
            param1: code,
          }).toString(),
          signal: AbortSignal.timeout(FETCH_MS),
        },
      );
      if (res.ok) {
        return { success: true, message: "کد تأیید ارسال شد" };
      }
    } catch {
      /* fall through to simple */
    }
  }

  const sender = process.env.SMS_SENDER;
  if (!sender) {
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
      signal: AbortSignal.timeout(FETCH_MS),
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

  /**
   * True when Melipayamak console OTP gateway will generate the code
   * (no shared bodyId; gateway preferred over free-text).
   */
  get generatesOwnCode(): boolean {
    if (getProvider() !== "melipayamak") return false;
    if (hasSharedChannel()) return false;
    if (preferSimpleOverGateway() && getMelipayamakSimpleUrl()) return false;
    return Boolean(getMelipayamakOtpUrl());
  }

  canSendTo(_phone: string): boolean {
    if (getProvider() === "melipayamak") {
      return Boolean(
        getMelipayamakSharedUrl() ||
          (hasSharedChannel() &&
            process.env.MELIPAYAMAK_USERNAME?.trim() &&
            process.env.MELIPAYAMAK_PASSWORD?.trim()) ||
          getMelipayamakOtpUrl() ||
          getMelipayamakSimpleUrl(),
      );
    }
    if (getProvider() === "kavenegar") {
      return Boolean(
        process.env.SMS_API_KEY &&
          (getKavenegarTemplate() || process.env.SMS_SENDER),
      );
    }
    return Boolean(
      process.env.SMS_API_KEY &&
        (getGhasedakTemplate() || process.env.SMS_SENDER),
    );
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
      return sendViaMelipayamak(phone, code);
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
  getMelipayamakSimpleUrl,
  getMelipayamakSharedUrl,
  getMelipayamakBodyId,
  preferSimpleOverGateway,
  hasSharedChannel,
};

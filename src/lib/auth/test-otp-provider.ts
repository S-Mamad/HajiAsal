import type { OtpProvider, OtpSendResult } from "./otp-provider";

export class TestOtpProvider implements OtpProvider {
  readonly name = "test";

  private testPhone: string;
  private testOtp: string;

  constructor() {
    this.testPhone =
      process.env.AUTH_TEST_PHONE?.replace(/\D/g, "").replace(/^9/, "09") ??
      "09123456789";
    const raw = process.env.AUTH_TEST_PHONE ?? "09123456789";
    const normalized =
      raw.replace(/\D/g, "").length === 10
        ? `0${raw.replace(/\D/g, "")}`
        : raw.replace(/\D/g, "").startsWith("989")
          ? `0${raw.replace(/\D/g, "").slice(2)}`
          : raw.replace(/\D/g, "");
    this.testPhone = normalized.length === 11 ? normalized : "09123456789";
    const envOtp = (process.env.AUTH_TEST_OTP ?? "1234").replace(/\D/g, "");
    this.testOtp = envOtp.length === 4 ? envOtp : "1234";
  }

  canSendTo(phone: string): boolean {
    return phone === this.testPhone;
  }

  async send(phone: string, _code: string): Promise<OtpSendResult> {
    if (!this.canSendTo(phone)) {
      return {
        success: false,
        message: "این شماره برای ورود تستی مجاز نیست",
      };
    }
    return {
      success: true,
      message: "کد تأیید ارسال شد",
    };
  }

  isTestPhone(phone: string): boolean {
    return phone === this.testPhone;
  }

  getTestOtp(): string {
    return this.testOtp;
  }
}

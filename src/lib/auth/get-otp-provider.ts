import { TestOtpProvider } from "./test-otp-provider";
import { SmsOtpProvider } from "./sms-otp-provider";
import type { OtpProvider } from "./otp-provider";

const testProvider = new TestOtpProvider();
const smsProvider = new SmsOtpProvider();

/** Test OTP is hard-denied in production regardless of AUTH_ALLOW_TEST_OTP. */
export function isTestOtpAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.AUTH_ALLOW_TEST_OTP === "false") return false;
  if (process.env.AUTH_ALLOW_TEST_OTP === "true") return true;
  return true;
}

export function getOtpProviderForPhone(phone: string): OtpProvider {
  if (isTestOtpAllowed() && testProvider.canSendTo(phone)) {
    return testProvider;
  }
  return smsProvider;
}

export function getTestOtpProvider(): TestOtpProvider {
  return testProvider;
}

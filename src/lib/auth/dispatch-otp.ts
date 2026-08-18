import {
  createOtpChallenge,
  discardOtpChallenge,
  generateOtpCode,
} from "@/lib/auth/otp-store";
import {
  getOtpProviderForPhone,
  getTestOtpProvider,
  isTestOtpAllowed,
} from "@/lib/auth/get-otp-provider";

export type DispatchOtpResult =
  | { ok: true; code: string; message: string }
  | { ok: false; message: string };

/**
 * Persist the challenge and hit the SMS provider together so the operator
 * request is not blocked on MySQL.
 */
export async function dispatchOtpSend(
  challengeKey: string,
  phone: string,
): Promise<DispatchOtpResult> {
  const testProvider = getTestOtpProvider();
  const provider = getOtpProviderForPhone(phone);
  const isTestPhone = isTestOtpAllowed() && testProvider.isTestPhone(phone);

  if (isTestPhone) {
    const code = testProvider.getTestOtp();
    const [, result] = await Promise.all([
      createOtpChallenge(challengeKey, code),
      provider.send(phone, code),
    ]);
    if (!result.success) {
      await discardOtpChallenge(challengeKey);
      return { ok: false, message: result.message };
    }
    return { ok: true, code, message: result.message };
  }

  if (provider.generatesOwnCode) {
    const result = await provider.send(phone, "");
    if (!result.success || !result.code) {
      return { ok: false, message: result.message };
    }
    try {
      await createOtpChallenge(challengeKey, result.code);
    } catch {
      return { ok: false, message: "خطا در ذخیره کد تأیید" };
    }
    return { ok: true, code: result.code, message: result.message };
  }

  const code = generateOtpCode();
  let persistOk = true;
  const [, result] = await Promise.all([
    createOtpChallenge(challengeKey, code).catch(() => {
      persistOk = false;
    }),
    provider.send(phone, code),
  ]);

  if (!result.success) {
    await discardOtpChallenge(challengeKey);
    return { ok: false, message: result.message };
  }

  if (!persistOk) {
    await discardOtpChallenge(challengeKey);
    return { ok: false, message: "خطا در ذخیره کد تأیید" };
  }

  if (result.code && result.code !== code) {
    try {
      await createOtpChallenge(challengeKey, result.code);
      return { ok: true, code: result.code, message: result.message };
    } catch {
      await discardOtpChallenge(challengeKey);
      return { ok: false, message: "خطا در ذخیره کد تأیید" };
    }
  }

  return { ok: true, code, message: result.message };
}

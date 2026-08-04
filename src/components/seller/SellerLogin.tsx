"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Storefront } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { OtpInput } from "@/components/auth/OtpInput";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import {
  formatPhoneInput,
  isValidIranMobile,
  maskPhone,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";
import { getOrCreateDeviceId } from "@/lib/auth/device-id";
import { hajiasalPath, sitePublicUrl } from "@/lib/paths";

const DEFAULT_OTP_LENGTH = 4;

export function SellerLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { seconds, canResend, start: startTimer } = useOtpTimer(120);
  const verifyingRef = useRef(false);

  const normalizedPhone = normalizePhoneInput(phone);

  const sendOtp = async () => {
    if (!isValidIranMobile(phone)) {
      setError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    verifyingRef.current = false;
    try {
      const res = await fetch("/api/seller/auth/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getOrCreateDeviceId(),
        },
        credentials: "include",
        body: JSON.stringify({
          phone: normalizedPhone,
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "خطا در ارسال کد");
        return;
      }
      setMessage("کد تأیید ارسال شد");
      const length =
        typeof data.codeLength === "number" &&
        data.codeLength >= 4 &&
        data.codeLength <= 10
          ? data.codeLength
          : DEFAULT_OTP_LENGTH;
      setOtpLength(length);
      setOtp("");
      setStep("otp");
      const wait =
        typeof data.resendAfterSec === "number" && data.resendAfterSec > 0
          ? data.resendAfterSec
          : 120;
      startTimer(wait);
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (verifyingRef.current || loading) return;
    if (otp.length !== otpLength) return;
    verifyingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: normalizedPhone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "کد تأیید نادرست است");
        verifyingRef.current = false;
        return;
      }
      router.push(hajiasalPath("/seller/dashboard"));
      router.refresh();
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کنید");
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      step === "otp" &&
      otp.length === otpLength &&
      !loading &&
      !verifyingRef.current
    ) {
      void verifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire when OTP completes
  }, [otp, step, otpLength]);

  return (
    <div
      className="panel-shell relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-zinc-950 px-4 py-16"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(180,83,9,0.18),_transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-[12px] border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-amber-300">
            <Storefront size={22} weight="fill" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              پنل فروشنده
            </h1>
            <p className="text-sm text-zinc-500">حاجی عسل · ورود با موبایل</p>
          </div>
        </div>

        {step === "phone" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendOtp();
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700">موبایل</span>
              <input
                dir="ltr"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                placeholder="0912 345 6789"
                autoComplete="tel"
                className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-amber-700/40 focus:ring-2 focus:ring-amber-700/15"
              />
              <span className="text-xs text-zinc-400">مثال: 09123456789</span>
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <AdminButton
              type="submit"
              disabled={loading || !isValidIranMobile(phone)}
              className="h-11 w-full"
            >
              {loading ? "در حال ارسال..." : "دریافت کد تأیید"}
            </AdminButton>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm text-zinc-500">
              کد ارسال‌شده به{" "}
              <span dir="ltr" className="font-medium text-zinc-800">
                {maskPhone(normalizedPhone)}
              </span>
            </p>
            {message ? (
              <p className="text-center text-xs text-amber-700">{message}</p>
            ) : null}
            <OtpInput
              value={otp}
              onChange={setOtp}
              length={otpLength}
              disabled={loading}
              error={error}
            />
            <AdminButton
              type="button"
              onClick={() => void verifyOtp()}
              disabled={loading || otp.length < otpLength}
              className="h-11 w-full"
            >
              {loading ? "در حال تأیید..." : "ورود به پنل"}
            </AdminButton>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <button
                type="button"
                className="hover:text-zinc-800"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                  verifyingRef.current = false;
                }}
              >
                تغییر شماره
              </button>
              <button
                type="button"
                disabled={!canResend || loading}
                className="disabled:opacity-50 hover:text-zinc-800"
                onClick={() => void sendOtp()}
              >
                {canResend ? "ارسال مجدد" : `ارسال مجدد (${seconds}ث)`}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          <a href={sitePublicUrl()} className="hover:text-zinc-600">
            بازگشت به فروشگاه
          </a>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Phone } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/auth/OtpInput";
import { Icon } from "@/components/ui/Icon";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import { syncWishlistBidirectional } from "@/lib/client/wishlist-sync";
import { useAuth } from "@/hooks/useAuth";
import {
  formatPhoneInput,
  isValidIranMobile,
  maskPhone,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";
import { getOrCreateDeviceId } from "@/lib/auth/device-id";

const DEFAULT_OTP_LENGTH = 4;

export type AuthWelcomeUser = {
  fullName: string;
  phone: string;
};

interface PhoneLoginFormProps {
  onNeedsRegister?: (phone: string) => void;
  onWelcome?: (user: AuthWelcomeUser) => void;
}

export function PhoneLoginForm({
  onNeedsRegister,
  onWelcome,
}: PhoneLoginFormProps) {
  const { refresh } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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
      const res = await fetch("/api/auth/otp/send", {
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
      setMessage(
        step === "otp"
          ? "کد جدید ارسال شد؛ کد قبلی دیگر معتبر نیست"
          : typeof data.message === "string" &&
              !String(data.message).includes("تست")
            ? data.message
            : "کد تأیید ارسال شد",
      );
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
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: normalizedPhone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "کد نادرست است");
        verifyingRef.current = false;
        return;
      }

      await refresh();

      if (data.isNewUser) {
        onNeedsRegister?.(normalizedPhone);
        return;
      }

      const fullName =
        typeof data.user?.fullName === "string" && data.user.fullName.trim()
          ? data.user.fullName.trim()
          : "";
      await syncWishlistBidirectional();
      onWelcome?.({
        fullName,
        phone:
          typeof data.user?.phone === "string"
            ? data.user.phone
            : normalizedPhone,
      });
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

  if (step === "phone") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendOtp();
        }}
        className="flex flex-col gap-5"
      >
        <Input
          label="شماره موبایل"
          placeholder="0912 345 6789"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          autoComplete="tel"
          inputMode="numeric"
        />
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        <Button
          type="submit"
          disabled={loading || !isValidIranMobile(phone)}
          className="w-full"
        >
          <Icon icon={Phone} size={18} />
          {loading ? "در حال ارسال..." : "دریافت کد تأیید"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5 text-center">
        <p className="text-sm text-muted">
          کد تأیید ارسال‌شده به{" "}
          <span dir="ltr" className="font-medium text-primary">
            {maskPhone(normalizedPhone)}
          </span>
        </p>
        <p className="text-[11px] text-dim">
          معمولاً چند ثانیه طول می‌کشد. کد تا ۱۰ دقیقه معتبر است.
        </p>
      </div>
      {message ? <p className="text-center text-xs text-gold">{message}</p> : null}
      <OtpInput
        value={otp}
        onChange={setOtp}
        length={otpLength}
        disabled={loading}
        error={error}
      />
      <Button
        type="button"
        onClick={() => void verifyOtp()}
        disabled={loading || otp.length < otpLength}
        className="w-full"
      >
        {loading ? "در حال تأیید..." : "ادامه"}
      </Button>
      <div className="flex items-center justify-between text-xs text-muted">
        <button
          type="button"
          className="text-gold hover:underline"
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
          className="disabled:opacity-50 hover:text-gold"
          onClick={() => void sendOtp()}
        >
          {canResend ? "ارسال مجدد" : `ارسال مجدد (${seconds}ث)`}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone } from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/auth/OtpInput";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import { syncWishlistToServer } from "@/lib/client/wishlist-sync";
import { useAuth } from "@/hooks/useAuth";
import {
  formatPhoneInput,
  isValidIranMobile,
  maskPhone,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";
import { safeInternalRedirect } from "@/lib/safe-redirect";

const DEFAULT_OTP_LENGTH = 4;

interface PhoneLoginFormProps {
  mode?: "login" | "register";
  onNeedsRegister?: (phone: string) => void;
}

export function PhoneLoginForm({
  mode = "login",
  onNeedsRegister,
}: PhoneLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const redirect = safeInternalRedirect(
    searchParams.get("redirect"),
    hajiasalPath("/account"),
  );

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { seconds, canResend, start: startTimer } = useOtpTimer(90);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "خطا در ارسال کد");
        return;
      }
      setMessage(
        typeof data.message === "string" && !String(data.message).includes("تست")
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
      startTimer();
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
        body: JSON.stringify({ phone: normalizedPhone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "کد نادرست است");
        setOtp("");
        verifyingRef.current = false;
        return;
      }

      await refresh();

      if (mode === "register" && !data.isNewUser) {
        await syncWishlistToServer();
        router.push(redirect);
        router.refresh();
        return;
      }

      if (data.isNewUser || mode === "register") {
        onNeedsRegister?.(normalizedPhone);
        return;
      }

      await syncWishlistToServer();
      router.push(redirect);
      router.refresh();
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کنید");
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "otp" && otp.length === otpLength && !loading && !verifyingRef.current) {
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
        className="flex flex-col gap-4"
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
      <p className="text-center text-xs text-muted">مرحله ۲ از ۲</p>
      <p className="text-center text-sm text-muted">
        کد تأیید ارسال‌شده به{" "}
        <span dir="ltr" className="font-medium text-primary">
          {maskPhone(normalizedPhone)}
        </span>
      </p>
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
        {loading ? "در حال تأیید..." : mode === "register" ? "ادامه ثبت‌نام" : "ورود"}
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

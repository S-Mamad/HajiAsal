"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import {
  formatPhoneInput,
  isValidIranMobile,
  maskPhone,
  normalizePhoneInput,
} from "@/lib/auth/phone-mask";
import { getOrCreateDeviceId } from "@/lib/auth/device-id";
import { normalizeOtpDigits } from "@/lib/auth/otp-digits";
import { hajiasalPath } from "@/lib/paths";
import { SELLER_APPLY_TERMS } from "@/lib/seller/apply-terms";
import {
  isAtLeast18,
  isValidBankCard,
  isValidNationalId,
  normalizeDigits,
  parseBirthDate,
} from "@/lib/seller/apply-validation";
import { cn } from "@/lib/utils";

const DEFAULT_OTP_LENGTH = 4;

type Step = "terms" | "phone" | "otp" | "form" | "done";
type UploadField = "front" | "back" | "commitment";

const TITLES: Record<Step, { title: string; subtitle: string }> = {
  terms: {
    title: "ثبت‌نام فروشنده",
    subtitle: "شرایط را بخوانید؛ سپس اطلاعات و مدارک را ارسال کنید",
  },
  phone: {
    title: "شماره موبایل",
    subtitle: "کد تأیید به همین شماره ارسال می‌شود",
  },
  otp: {
    title: "کد تأیید",
    subtitle: "پس از تأیید، فرم ثبت‌نام باز می‌شود",
  },
  form: {
    title: "اطلاعات و مدارک",
    subtitle: "همه فیلدها را کامل کنید؛ درخواست پس از بررسی ادمین فعال می‌شود",
  },
  done: {
    title: "درخواست ثبت شد",
    subtitle: "تا تأیید ادمین، ورود به پنل فروشنده ممکن نیست",
  },
};

export function SellerApplyClient() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>("terms");
  const [accepted, setAccepted] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLength, setOtpLength] = useState(DEFAULT_OTP_LENGTH);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { seconds, canResend, start: startTimer } = useOtpTimer(120);
  const verifyingRef = useRef(false);

  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [bankCard, setBankCard] = useState("");
  const [productsIntro, setProductsIntro] = useState("");
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [commitmentUrl, setCommitmentUrl] = useState("");
  const [uploading, setUploading] = useState<UploadField | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const normalizedPhone = normalizePhoneInput(phone);
  const copy = TITLES[step];

  const go = (next: Step) => {
    setError("");
    setFieldErrors({});
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/seller/apply", { credentials: "include" });
        const data = await res.json();
        if (data.authenticated && data.phone) {
          setVerifiedPhone(data.phone);
          setPhone(data.phone);
          setAccepted(true);
          setStep("form");
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

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
      const res = await fetch("/api/seller/apply/otp/send", {
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
      setOtpLength(
        typeof data.codeLength === "number" &&
          data.codeLength >= 4 &&
          data.codeLength <= 10
          ? data.codeLength
          : DEFAULT_OTP_LENGTH,
      );
      setOtp("");
      go("otp");
      startTimer(
        typeof data.resendAfterSec === "number" && data.resendAfterSec > 0
          ? data.resendAfterSec
          : 120,
      );
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = useCallback(async () => {
    if (verifyingRef.current || loading) return;
    if (otp.length !== otpLength) return;
    verifyingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/apply/otp/verify", {
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
      setVerifiedPhone(data.phone ?? normalizedPhone);
      setError("");
      setFieldErrors({});
      setStep("form");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کنید");
      verifyingRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [loading, otp, otpLength, normalizedPhone]);

  useEffect(() => {
    if (
      step === "otp" &&
      otp.length === otpLength &&
      !loading &&
      !verifyingRef.current
    ) {
      void verifyOtp();
    }
  }, [otp, step, otpLength, loading, verifyOtp]);

  const uploadFile = async (field: UploadField, file: File) => {
    setUploading(field);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append(
        "kind",
        field === "front"
          ? "id-front"
          : field === "back"
            ? "id-back"
            : "commitment",
      );
      const res = await fetch("/api/seller/apply/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "آپلود ناموفق بود");
        return;
      }
      const url = String(data.file?.url ?? "");
      if (field === "front") setFrontUrl(url);
      else if (field === "back") setBackUrl(url);
      else setCommitmentUrl(url);
    } catch {
      setError("آپلود انجام نشد");
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) nextErrors.fullName = "نام را کامل وارد کنید";
    if (!isValidNationalId(nationalId)) nextErrors.nationalId = "کد ملی نامعتبر است";
    const birth = parseBirthDate(birthDate);
    if (!birth) nextErrors.birthDate = "تاریخ تولد نامعتبر است";
    else if (!isAtLeast18(birth))
      nextErrors.birthDate = "حداقل سن ۱۸ سال تمام است";
    if (address.trim().length < 5) nextErrors.address = "آدرس را کامل‌تر بنویسید";
    if (!isValidBankCard(bankCard)) nextErrors.bankCard = "شماره کارت نامعتبر است";
    if (productsIntro.trim().length < 10)
      nextErrors.productsIntro = "معرفی محصولات را کامل‌تر بنویسید";
    if (!frontUrl) nextErrors.front = "تصویر روی کارت ملی الزامی است";
    if (!commitmentUrl) nextErrors.commitment = "تصویر تعهدنامه الزامی است";

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("لطفاً موارد علامت‌خورده را اصلاح کنید");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: fullName.trim(),
          nationalId: normalizeDigits(nationalId),
          birthDate,
          address: address.trim(),
          bankCard: normalizeDigits(bankCard),
          productsIntro: productsIntro.trim(),
          nationalIdFrontUrl: frontUrl,
          nationalIdBackUrl: backUrl || null,
          commitmentLetterUrl: commitmentUrl,
          termsAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "ثبت درخواست ناموفق بود");
        return;
      }
      go("done");
    } catch {
      setError("اتصال برقرار نشد");
    } finally {
      setLoading(false);
    }
  };

  const progress =
    step === "terms"
      ? 1
      : step === "phone" || step === "otp"
        ? 2
        : step === "form"
          ? 3
          : 4;

  return (
    <AuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      contentAlign={step === "form" || step === "terms" ? "start" : "center"}
    >
      <motion.div
        key={step}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        className="flex flex-col gap-6"
      >
        {step !== "done" ? (
          <div className="flex items-center gap-2" aria-hidden>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors duration-300",
                  progress >= n ? "bg-gold" : "bg-border",
                )}
              />
            ))}
          </div>
        ) : null}

        {step === "terms" ? (
          <div className="flex flex-col gap-5">
            <div className="max-h-[min(42dvh,20rem)] space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-border/70 bg-surface-elevated/60 p-4 text-[13px] leading-relaxed text-secondary [-webkit-overflow-scrolling:touch]">
              <p className="font-medium text-primary">
                {SELLER_APPLY_TERMS.requiredInfoTitle}
              </p>
              <ul className="list-disc space-y-1 pr-4">
                {SELLER_APPLY_TERMS.requiredInfo.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="font-medium text-primary">متن تعهدنامه</p>
              <pre className="whitespace-pre-wrap font-sans text-[12px] text-muted">
                {SELLER_APPLY_TERMS.commitmentTemplate}
              </pre>
              <p className="font-medium text-primary">
                {SELLER_APPLY_TERMS.rulesTitle}
              </p>
              <ol className="list-decimal space-y-1.5 pr-4">
                {SELLER_APPLY_TERMS.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ol>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-surface-elevated/40 p-3.5 text-sm text-secondary">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-gold focus:ring-gold/30"
              />
              <span>شرایط و قوانین ثبت‌نام فروشنده را می‌پذیرم.</span>
            </label>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <Button
              type="button"
              className="w-full"
              disabled={!accepted}
              onClick={() => go("phone")}
            >
              ادامه
            </Button>
          </div>
        ) : null}

        {step === "phone" ? (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void sendOtp();
            }}
          >
            <Input
              label="شماره موبایل"
              dir="ltr"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="0912 345 6789"
              autoComplete="tel"
              error={error || undefined}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isValidIranMobile(phone)}
            >
              {loading ? "در حال ارسال..." : "دریافت کد تأیید"}
            </Button>
            <button
              type="button"
              onClick={() => go("terms")}
              className="text-center text-xs text-muted hover:text-secondary"
            >
              بازگشت به شرایط
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <div className="flex flex-col gap-5">
            <p className="text-center text-sm text-muted">
              کد ارسال‌شده به{" "}
              <span dir="ltr" className="font-medium text-primary">
                {maskPhone(normalizedPhone)}
              </span>
            </p>
            {message ? (
              <p className="text-center text-xs text-gold">{message}</p>
            ) : null}

            <ApplyOtpInput
              value={otp}
              onChange={setOtp}
              length={otpLength}
              disabled={loading}
            />
            {error ? (
              <p className="text-center text-sm text-red-500">{error}</p>
            ) : null}

            <Button
              type="button"
              className="w-full"
              disabled={loading || otp.length < otpLength}
              onClick={() => void verifyOtp()}
            >
              {loading ? "در حال تأیید..." : "تأیید و ادامه فرم"}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted">
              <button
                type="button"
                className="hover:text-secondary"
                onClick={() => {
                  verifyingRef.current = false;
                  setOtp("");
                  go("phone");
                }}
              >
                تغییر شماره
              </button>
              <button
                type="button"
                disabled={!canResend || loading}
                className="disabled:opacity-50 hover:text-secondary"
                onClick={() => void sendOtp()}
              >
                {canResend ? "ارسال مجدد" : `ارسال مجدد (${seconds}ث)`}
              </button>
            </div>
          </div>
        ) : null}

        {step === "form" ? (
          <div className="flex flex-col gap-5">
            <p className="rounded-2xl border border-border/70 bg-surface-elevated/50 px-3.5 py-3 text-[13px] leading-relaxed text-secondary">
              موبایل تأییدشده:{" "}
              <span dir="ltr" className="font-medium text-primary">
                {maskPhone(verifiedPhone || normalizedPhone)}
              </span>
            </p>

            <Input
              label="نام و نام خانوادگی"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              error={fieldErrors.fullName}
            />
            <Input
              label="کد ملی"
              dir="ltr"
              inputMode="numeric"
              value={nationalId}
              onChange={(e) =>
                setNationalId(normalizeDigits(e.target.value).slice(0, 10))
              }
              error={fieldErrors.nationalId}
            />
            <Input
              label="تاریخ تولد"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              error={fieldErrors.birthDate}
              className="appearance-none"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                آدرس کامل محل سکونت
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className={cn(
                  "rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-primary",
                  "placeholder:text-dim focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30",
                  fieldErrors.address && "border-red-400",
                )}
              />
              {fieldErrors.address ? (
                <p className="text-xs text-red-500">{fieldErrors.address}</p>
              ) : null}
            </div>

            <Input
              label="شماره کارت بانکی"
              dir="ltr"
              inputMode="numeric"
              value={bankCard}
              onChange={(e) =>
                setBankCard(normalizeDigits(e.target.value).slice(0, 16))
              }
              placeholder="۱۶ رقم"
              error={fieldErrors.bankCard}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                معرفی محصولات یا خدمات
              </label>
              <textarea
                value={productsIntro}
                onChange={(e) => setProductsIntro(e.target.value)}
                rows={4}
                placeholder="چه کالاهایی قصد فروش دارید؟"
                className={cn(
                  "rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-primary",
                  "placeholder:text-dim focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30",
                  fieldErrors.productsIntro && "border-red-400",
                )}
              />
              {fieldErrors.productsIntro ? (
                <p className="text-xs text-red-500">{fieldErrors.productsIntro}</p>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5">
              <p className="text-sm font-medium text-primary">مدارک</p>
              <p className="text-xs text-muted">تصویر یا PDF، حداکثر ۵ مگابایت</p>
              <UploadField
                label="کارت ملی (رو)"
                required
                url={frontUrl}
                uploading={uploading === "front"}
                error={fieldErrors.front}
                onFile={(f) => void uploadFile("front", f)}
              />
              <UploadField
                label="کارت ملی (پشت)"
                url={backUrl}
                uploading={uploading === "back"}
                onFile={(f) => void uploadFile("back", f)}
              />
              <UploadField
                label="تعهدنامه دست‌نویس"
                required
                url={commitmentUrl}
                uploading={uploading === "commitment"}
                error={fieldErrors.commitment}
                onFile={(f) => void uploadFile("commitment", f)}
              />
            </div>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <Button
              type="button"
              className="w-full"
              disabled={loading || Boolean(uploading)}
              onClick={() => void submit()}
            >
              {loading ? "در حال ارسال..." : "ارسال درخواست"}
            </Button>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-secondary">
              درخواست شما ثبت شد و در صف بررسی قرار گرفت. پس از تأیید ادمین
              می‌توانید با همین شماره موبایل وارد پنل فروشنده شوید.
            </p>
            <Button href={hajiasalPath("/")} className="w-full">
              بازگشت به فروشگاه
            </Button>
          </div>
        ) : null}

        {step === "terms" || step === "phone" ? (
          <p className="text-center text-xs text-muted">
            <Link
              href={hajiasalPath("/seller")}
              className="text-gold hover:underline"
            >
              ورود پنل فروشنده
            </Link>
          </p>
        ) : null}
      </motion.div>
    </AuthLayout>
  );
}

function ApplyOtpInput({
  value,
  onChange,
  length,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  length: number;
  disabled?: boolean;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const updateAt = (index: number, char: string) => {
    const next = [...digits.map((d) => (d === " " ? "" : d))];
    next[index] = char;
    onChange(next.join("").slice(0, length));
  };

  return (
    <div className="flex justify-center gap-2.5 sm:gap-3" dir="ltr">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digits[i]?.trim() ?? ""}
          onChange={(e) => {
            const char = normalizeOtpDigits(e.target.value).slice(-1);
            if (!char) return;
            updateAt(i, char);
            if (i < length - 1) inputsRef.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key !== "Backspace") return;
            e.preventDefault();
            const current = digits[i]?.trim() ?? "";
            if (current) updateAt(i, "");
            else if (i > 0) {
              updateAt(i - 1, "");
              inputsRef.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = normalizeOtpDigits(
              e.clipboardData.getData("text"),
            ).slice(0, length);
            onChange(pasted);
            inputsRef.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          aria-label={`رقم ${i + 1}`}
          className={cn(
            "h-12 w-11 rounded-xl border border-border/80 bg-surface-elevated/80 text-center text-lg font-bold text-primary sm:h-14 sm:w-12 sm:text-xl",
            "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25",
          )}
        />
      ))}
    </div>
  );
}

function UploadField({
  label,
  url,
  uploading,
  required,
  error,
  onFile,
}: {
  label: string;
  url: string;
  uploading: boolean;
  required?: boolean;
  error?: string;
  onFile: (file: File) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-secondary">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <label
        className={cn(
          "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-xs transition",
          error
            ? "border-red-400 bg-red-500/5 text-red-500"
            : url
              ? "border-gold/40 bg-gold/5 text-secondary"
              : "border-border bg-surface-elevated/50 text-muted",
        )}
      >
        <span className="min-w-0 truncate">
          {uploading
            ? "در حال آپلود..."
            : url
              ? "فایل آماده است · برای تعویض لمس کنید"
              : "انتخاب تصویر یا PDF"}
        </span>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </label>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

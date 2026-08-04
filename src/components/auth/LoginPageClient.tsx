"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthWelcome } from "@/components/auth/AuthWelcome";
import { hajiasalPath } from "@/lib/paths";
import { useAuth } from "@/hooks/useAuth";
import { isProfileComplete } from "@/lib/auth/profile-complete";
import { safeInternalRedirect } from "@/lib/safe-redirect";
import { maskPhone } from "@/lib/auth/phone-mask";

type Step = "auth" | "complete-profile" | "welcome";

type WelcomeUser = {
  fullName: string;
  phone: string;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refresh } = useAuth();

  const redirect = safeInternalRedirect(
    searchParams.get("redirect"),
    hajiasalPath("/account"),
  );
  const wantComplete = searchParams.get("step") === "complete";

  const [step, setStep] = useState<Step>(
    wantComplete ? "complete-profile" : "auth",
  );
  const [phone, setPhone] = useState("");
  const [welcomeUser, setWelcomeUser] = useState<WelcomeUser | null>(null);

  useEffect(() => {
    if (authLoading) return;

    // Logged-in complete user opened /login directly (not mid-welcome).
    if (
      user &&
      isProfileComplete(user.fullName) &&
      step === "auth" &&
      !welcomeUser
    ) {
      router.replace(redirect);
      return;
    }

    if (
      user &&
      !isProfileComplete(user.fullName) &&
      step !== "welcome"
    ) {
      setPhone(user.phone);
      setStep("complete-profile");
    }
  }, [authLoading, user, step, welcomeUser, redirect, router]);

  const handleNeedsRegister = (p: string) => {
    setPhone(p);
    setStep("complete-profile");
  };

  const handleWelcome = (u: WelcomeUser) => {
    setWelcomeUser(u);
    setStep("welcome");
  };

  const finishWelcome = () => {
    router.push(redirect);
    router.refresh();
  };

  const title =
    step === "complete-profile"
      ? "تکمیل ثبت‌نام"
      : step === "welcome"
        ? "خوش آمدید"
        : "ورود یا ثبت‌نام";

  const subtitle =
    step === "complete-profile"
      ? "نام شما برای سفارش و پشتیبانی لازم است"
      : step === "welcome"
        ? "در حال انتقال به حساب شما"
        : "با شماره موبایل؛ اگر حساب ندارید همین‌جا ساخته می‌شود";

  if (authLoading) {
    return (
      <AuthLayout title="ورود یا ثبت‌نام" subtitle="لطفاً کمی صبر کنید">
        <p className="text-sm text-muted">در حال بررسی نشست...</p>
      </AuthLayout>
    );
  }

  if (
    user &&
    isProfileComplete(user.fullName) &&
    step === "auth" &&
    !welcomeUser
  ) {
    return (
      <AuthLayout title="ورود یا ثبت‌نام" subtitle="در حال انتقال...">
        <p className="text-sm text-muted">در حال هدایت...</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title} subtitle={subtitle}>
      {step === "welcome" && welcomeUser ? (
        <AuthWelcome
          fullName={welcomeUser.fullName}
          phone={welcomeUser.phone}
          onContinue={finishWelcome}
        />
      ) : null}

      {step === "complete-profile" ? (
        <div className="flex flex-col gap-5">
          {(phone || user?.phone) ? (
            <p className="text-sm text-muted">
              شماره{" "}
              <span dir="ltr" className="font-medium text-primary">
                {maskPhone(phone || user?.phone || "")}
              </span>
            </p>
          ) : null}
          <RegisterForm
            phone={phone || user?.phone || ""}
            onCompleted={async () => {
              await refresh();
            }}
          />
        </div>
      ) : null}

      {step === "auth" ? (
        <>
          <PhoneLoginForm
            onNeedsRegister={handleNeedsRegister}
            onWelcome={handleWelcome}
          />
          <p className="mt-8 text-center text-xs leading-relaxed text-muted">
            با ادامه،{" "}
            <Link
              href={hajiasalPath("/terms")}
              className="text-gold hover:underline"
            >
              قوانین
            </Link>{" "}
            و{" "}
            <Link
              href={hajiasalPath("/privacy")}
              className="text-gold hover:underline"
            >
              حریم خصوصی
            </Link>{" "}
            را می‌پذیرید.
          </p>
        </>
      ) : null}
    </AuthLayout>
  );
}

export function LoginPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center text-muted">
          در حال بارگذاری...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthWelcome } from "@/components/auth/AuthWelcome";
import { hajiasalPath, sellerPublicUrl, sitePublicUrl } from "@/lib/paths";
import { useAuth } from "@/hooks/useAuth";
import { isProfileComplete } from "@/lib/auth/profile-complete";
import { safeAuthRedirect } from "@/lib/safe-redirect";
import { maskPhone } from "@/lib/auth/phone-mask";

type Step = "auth" | "complete-profile" | "welcome";

type WelcomeUser = {
  fullName: string;
  phone: string;
};

const PANEL_BOUNCE_KEY = "hajiasal.panel.handoff.bounce";

/** Panel return targets: skip welcome splash so login does not feel like a restart. */
function isPanelRedirect(target: string): boolean {
  try {
    if (/^https?:\/\//i.test(target)) {
      const path = new URL(target).pathname;
      return path.startsWith("/admin") || path.startsWith("/seller");
    }
  } catch {
    /* fall through */
  }
  return (
    target.startsWith("/admin") ||
    target.startsWith("/seller") ||
    target.includes("/admin/") ||
    target.includes("/seller/")
  );
}

function readBounceTarget(): string | null {
  try {
    return sessionStorage.getItem(PANEL_BOUNCE_KEY);
  } catch {
    return null;
  }
}

function writeBounceTarget(target: string) {
  try {
    sessionStorage.setItem(PANEL_BOUNCE_KEY, target);
  } catch {
    /* private mode */
  }
}

function clearBounceTarget() {
  try {
    sessionStorage.removeItem(PANEL_BOUNCE_KEY);
  } catch {
    /* private mode */
  }
}

async function panelHandoffUrl(redirect: string): Promise<string | null> {
  const res = await fetch("/api/auth/panel-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({ redirect }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return typeof data.url === "string" && data.url.startsWith("http")
    ? data.url
    : null;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refresh } = useAuth();
  const navigatedRef = useRef(false);

  const redirect = safeAuthRedirect(
    searchParams.get("redirect"),
    hajiasalPath("/account"),
  );
  const stayOnLogin = searchParams.get("stay") === "1";
  const wantComplete = searchParams.get("step") === "complete";

  const [step, setStep] = useState<Step>("auth");
  const [phone, setPhone] = useState("");
  const [welcomeUser, setWelcomeUser] = useState<WelcomeUser | null>(null);
  const [panelNavFailed, setPanelNavFailed] = useState(stayOnLogin);
  const [handingOff, setHandingOff] = useState(false);

  const navigateAfterAuth = async (target: string) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;

    if (/^https?:\/\//i.test(target) && isPanelRedirect(target)) {
      setHandingOff(true);
      writeBounceTarget(target);
      try {
        const url = await panelHandoffUrl(target);
        window.location.replace(url ?? target);
      } catch {
        navigatedRef.current = false;
        setHandingOff(false);
        setPanelNavFailed(true);
      }
      return;
    }

    if (/^https?:\/\//i.test(target)) {
      window.location.replace(target);
      return;
    }

    clearBounceTarget();
    router.replace(target);
    router.refresh();
  };

  useEffect(() => {
    if (authLoading) return;
    if (handingOff) return;

    if (
      user &&
      isProfileComplete(user.fullName) &&
      step === "auth" &&
      !welcomeUser
    ) {
      const bounced = readBounceTarget() === redirect;
      if (isPanelRedirect(redirect) && (stayOnLogin || panelNavFailed || bounced)) {
        return;
      }
      void navigateAfterAuth(redirect);
      return;
    }

    if (
      user &&
      !isProfileComplete(user.fullName) &&
      step !== "welcome"
    ) {
      setPhone(user.phone);
      setStep("complete-profile");
      return;
    }

    // ?step=complete without session → force OTP first (no empty phone form).
    if (wantComplete && !user && step === "complete-profile") {
      setStep("auth");
    }
  }, [
    authLoading,
    user,
    step,
    welcomeUser,
    redirect,
    wantComplete,
    stayOnLogin,
    panelNavFailed,
    handingOff,
  ]);

  const handleNeedsRegister = (p: string) => {
    setPhone(p);
    setStep("complete-profile");
  };

  const handleWelcome = (u: WelcomeUser) => {
    clearBounceTarget();
    setPanelNavFailed(false);
    // Admin/seller return: go straight to panel (no welcome flash / auto-timer).
    if (isPanelRedirect(redirect)) {
      void navigateAfterAuth(redirect);
      return;
    }
    setWelcomeUser(u);
    setStep("welcome");
  };

  const finishWelcome = () => {
    void navigateAfterAuth(redirect);
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

  const showAuthForm = step === "auth" && !welcomeUser;

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

      {showAuthForm ? (
        <>
          {handingOff ? (
            <p className="mb-5 text-sm text-muted">در حال ورود به پنل...</p>
          ) : null}
          {panelNavFailed && isPanelRedirect(redirect) ? (
            <p className="mb-5 rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 text-sm leading-6 text-primary">
              ورود به پنل کامل نشد. شماره را وارد کنید تا کد دوباره برایتان
              ارسال شود.
            </p>
          ) : null}
          <PhoneLoginForm
            onNeedsRegister={handleNeedsRegister}
            onWelcome={handleWelcome}
          />
          <p className="mt-8 text-center text-xs leading-relaxed text-muted">
            با ادامه،{" "}
            <a
              href={`${sitePublicUrl()}/terms`}
              className="text-gold hover:underline"
            >
              قوانین
            </a>{" "}
            و{" "}
            <a
              href={`${sitePublicUrl()}/privacy`}
              className="text-gold hover:underline"
            >
              حریم خصوصی
            </a>{" "}
            را می‌پذیرید.
          </p>
          <p className="mt-4 text-center text-xs text-muted">
            فروشنده‌اید؟{" "}
            <a
              href={sellerPublicUrl()}
              className="text-gold hover:underline"
            >
              ورود پنل فروشنده
            </a>
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

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[hajiasal] route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium text-gold">خطا</p>
      <h1 className="mt-2 text-xl font-semibold text-primary sm:text-2xl">
        مشکلی در نمایش این صفحه پیش آمد
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-secondary">
        لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت، چند لحظه بعد برگردید یا از
        صفحه اصلی ادامه دهید.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-dim" dir="ltr">
          کد: {error.digest}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          تلاش مجدد
        </Button>
        <Button href={hajiasalPath("/")} variant="outline">
          صفحه اصلی
        </Button>
      </div>
    </div>
  );
}

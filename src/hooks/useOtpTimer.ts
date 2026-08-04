"use client";

import { useEffect, useState } from "react";

export function useOtpTimer(initialSeconds = 60) {
  const [seconds, setSeconds] = useState(0);

  const start = (overrideSeconds?: number) =>
    setSeconds(
      typeof overrideSeconds === "number" && overrideSeconds > 0
        ? overrideSeconds
        : initialSeconds,
    );

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return {
    seconds,
    canResend: seconds <= 0,
    start,
  };
}

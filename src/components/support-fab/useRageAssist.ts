"use client";

import { useEffect, useRef, useState } from "react";
import { hapticPulse } from "@/lib/ui/haptic";
import { isRageClickTarget, shouldTriggerRageAssist } from "@/lib/support-fab/rage";

export function useRageAssist(enabled: boolean): boolean {
  const [active, setActive] = useState(false);
  const stamps = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      if (!isRageClickTarget(event.target)) return;
      const now = Date.now();
      stamps.current = [...stamps.current, now].slice(-6);
      if (shouldTriggerRageAssist(stamps.current, now)) {
        setActive(true);
        hapticPulse(40);
        window.setTimeout(() => setActive(false), 8000);
      }
    };
    const onInvalid = () => {
      const now = Date.now();
      stamps.current = [...stamps.current, now, now].slice(-6);
      if (shouldTriggerRageAssist(stamps.current, now)) {
        setActive(true);
        hapticPulse(40);
        window.setTimeout(() => setActive(false), 8000);
      }
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("invalid", onInvalid, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("invalid", onInvalid, true);
    };
  }, [enabled]);

  return active;
}

"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { maskPhone } from "@/lib/auth/phone-mask";

interface AuthWelcomeProps {
  fullName: string;
  phone: string;
  onContinue: () => void;
  /** Auto-advance delay in ms (0 = disabled). */
  autoMs?: number;
}

export function AuthWelcome({
  fullName,
  phone,
  onContinue,
  autoMs = 1600,
}: AuthWelcomeProps) {
  const reduced = useReducedMotion();
  const continued = useRef(false);

  const continueOnce = () => {
    if (continued.current) return;
    continued.current = true;
    onContinue();
  };

  useEffect(() => {
    if (autoMs <= 0) return;
    const t = window.setTimeout(continueOnce, autoMs);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, [autoMs]);

  const firstName = fullName.trim().split(/\s+/)[0] || fullName;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="flex flex-col gap-6"
    >
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">
          ورود موفق
        </p>
        <p className="font-display text-2xl font-bold text-primary">
          خوش آمدید، {firstName}
        </p>
        <p className="text-sm text-muted" dir="ltr">
          {maskPhone(phone)}
        </p>
      </div>
      <Button type="button" onClick={continueOnce} className="w-full">
        ادامه
      </Button>
    </motion.div>
  );
}

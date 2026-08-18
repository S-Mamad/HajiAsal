"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { formatPrice } from "@/lib/utils";

interface AnimatedTotalProps {
  value: number;
  className?: string;
}

export function AnimatedTotal({ value, className }: AnimatedTotalProps) {
  const [display, setDisplay] = useState(value);
  const [blurred, setBlurred] = useState(false);
  const prev = useRef(value);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef(value);
  targetRef.current = value;

  useEffect(() => {
    if (prev.current === value) {
      setDisplay(value);
      return;
    }
    const from = prev.current;
    prev.current = value;
    setBlurred(true);

    const blurTimer = window.setTimeout(() => {
      setBlurred(false);
      const start = performance.now();
      const duration = 420;
      const to = targetRef.current;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(from + (to - from) * eased));
        if (t < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(to);
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    }, 200);

    return () => {
      window.clearTimeout(blurTimer);
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      // Never leave a stale mid-animation number on screen.
      setDisplay(targetRef.current);
      setBlurred(false);
    };
  }, [value]);

  return (
    <motion.span
      className={className}
      animate={{
        filter: blurred ? "blur(4px)" : "blur(0px)",
        opacity: blurred ? 0.55 : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      {formatPrice(display)}
    </motion.span>
  );
}

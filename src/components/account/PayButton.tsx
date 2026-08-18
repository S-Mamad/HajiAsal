"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { hapticMedium } from "@/lib/ui/haptic";

type PaymentMethod = "online" | "snappay";

interface PayButtonProps {
  orderId: string;
  disabled?: boolean;
  onHandoffStart?: () => void;
  onHandoffEnd?: () => void;
  onError?: (message: string) => void;
  className?: string;
}

/** Unlock if gateway create hangs or navigation is blocked. */
const STUCK_LOADING_MS = 20_000;

async function resolvePaymentMethod(orderId: string): Promise<PaymentMethod> {
  const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("روش پرداخت سفارش مشخص نشد. صفحه را تازه کنید.");
  }
  const data = (await res.json()) as {
    order?: { paymentMethod?: PaymentMethod };
  };
  if (data.order?.paymentMethod === "snappay") return "snappay";
  if (data.order?.paymentMethod === "online") return "online";
  throw new Error("روش پرداخت سفارش مشخص نشد. صفحه را تازه کنید.");
}

async function createGatewaySession(
  orderId: string,
  method: PaymentMethod,
): Promise<string> {
  const endpoint =
    method === "snappay"
      ? "/api/checkout/snappay/create"
      : "/api/checkout/create";
  const res = await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    redirectUrl?: string;
    message?: string;
  };
  if (!res.ok || !data.redirectUrl) {
    throw new Error(
      typeof data.message === "string" && data.message
        ? data.message
        : "انتقال به درگاه پرداخت ممکن نشد",
    );
  }
  return data.redirectUrl;
}

/**
 * Starts the payment gateway directly for a pending order.
 * Avoids bouncing through checkout (which left users on a stuck handoff screen).
 */
export function PayButton({
  orderId,
  disabled = false,
  onHandoffStart,
  onHandoffEnd,
  onError,
  className,
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const stuckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const gen = useRef(0);

  const clearTimers = () => {
    if (stuckTimer.current) {
      clearTimeout(stuckTimer.current);
      stuckTimer.current = null;
    }
  };

  const resetLoading = () => {
    gen.current += 1;
    clearTimers();
    setLoading(false);
    onHandoffEnd?.();
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimers();
    };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && loading) {
        resetLoading();
      }
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && loading) resetLoading();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only while loading
  }, [loading]);

  const handleClick = () => {
    if (disabled || loading) return;
    hapticMedium();
    const myGen = ++gen.current;
    setLoading(true);
    onHandoffStart?.();
    clearTimers();
    stuckTimer.current = setTimeout(() => {
      if (!alive.current || myGen !== gen.current) return;
      setLoading(false);
      onHandoffEnd?.();
      onError?.("انتقال طولانی شد. دوباره تلاش کنید.");
    }, STUCK_LOADING_MS);

    void (async () => {
      try {
        const method = await resolvePaymentMethod(orderId);
        if (myGen !== gen.current) return;
        const redirectUrl = await createGatewaySession(orderId, method);
        if (myGen !== gen.current) return;
        window.location.replace(redirectUrl);
      } catch (err) {
        if (!alive.current || myGen !== gen.current) return;
        resetLoading();
        onError?.(
          err instanceof Error ? err.message : "انتقال به درگاه ممکن نشد",
        );
      }
    })();
  };

  return (
    <motion.button
      type="button"
      disabled={disabled || loading}
      onClick={handleClick}
      whileTap={disabled || loading ? undefined : { scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "inline-flex h-11 min-w-[96px] items-center justify-center rounded-full px-5",
        "text-sm font-semibold text-ink-on-gold",
        "transition-[opacity,background-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        disabled || loading
          ? "bg-gold/70 opacity-70"
          : "bg-gold active:bg-gold-bright",
        className,
      )}
    >
      {loading ? (
        <CircleNotch size={18} className="animate-spin" aria-hidden />
      ) : (
        "پرداخت"
      )}
      <span className="sr-only">
        {loading ? "در حال انتقال به صفحه پرداخت" : "پرداخت سفارش"}
      </span>
    </motion.button>
  );
}

"use client";

import { useEffect } from "react";
import { useVisualViewportOffset } from "@/hooks/useVisualViewportOffset";
import { cn } from "@/lib/utils";

/**
 * Full-bleed mobile chat stage for /account/tickets/* threads.
 * Locks page scroll, fills the gap between site header and account nav,
 * and shrinks with the on-screen keyboard via Visual Viewport.
 */
export function AccountTicketChatShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const keyboardOffset = useVisualViewportOffset();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const html = document.documentElement;
    const body = document.body;
    let lockedScrollY = 0;

    const lock = () => {
      if (!mq.matches) return;
      lockedScrollY = window.scrollY;
      html.classList.add("account-ticket-chat-active");
      body.style.position = "fixed";
      body.style.top = `-${lockedScrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
    };

    const unlock = () => {
      html.classList.remove("account-ticket-chat-active");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      window.scrollTo(0, lockedScrollY);
    };

    const onChange = () => {
      unlock();
      if (mq.matches) lock();
    };

    lock();
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      unlock();
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-[105] flex min-h-0 flex-col overflow-hidden bg-surface",
        "top-[var(--site-header-h,4rem)]",
        "bottom-[calc(var(--account-ticket-chat-bottom)+var(--ticket-keyboard-inset,0px))]",
        /* Stay immersive until lg — matches bottom account nav + body scroll lock. */
        "lg:static lg:inset-auto lg:z-auto lg:bottom-auto lg:top-auto",
        "lg:h-[min(calc(100dvh-8rem),48rem)] lg:overflow-hidden",
        "lg:rounded-[1.75rem] lg:border lg:border-border",
        "lg:shadow-[0_28px_64px_-36px_rgb(28_25_23/0.42)]",
      )}
      style={
        {
          ["--ticket-keyboard-inset" as string]: `${keyboardOffset}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

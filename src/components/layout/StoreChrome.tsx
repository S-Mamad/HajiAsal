"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { SiteConfig } from "@/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileDock } from "@/components/menu";
import { CartLiveRegion } from "@/components/cart/CartLiveRegion";
import { AbandonedCartChip } from "@/components/cart/AbandonedCartChip";
import { CartHoldSync } from "@/components/cart/CartHoldSync";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import {
  shouldHideStoreFooter,
  shouldShowFloatingNav,
} from "@/lib/layout/floating-nav";
import { isAccountTicketChatPath } from "@/lib/account/ticket-chat-path";
import { cn } from "@/lib/utils";

const SupportFabRoot = dynamic(
  () => import("@/components/support-fab/SupportFabRoot"),
  { ssr: false },
);

const BARE_CHROME =
  /^\/(login|register|forgot-password|admin|seller)(\/|$)/;

interface StoreChromeProps {
  children: React.ReactNode;
  siteSettings: SiteConfig;
  /** Panel deployments (APP_ROLE=admin|seller) never show store chrome. */
  forceBare?: boolean;
}

export function StoreChrome({
  children,
  siteSettings,
  forceBare = false,
}: StoreChromeProps) {
  const pathname = usePathname();
  const isBare = forceBare || BARE_CHROME.test(pathname ?? "");
  const showFloatingNav = !isBare && shouldShowFloatingNav(pathname ?? "");
  const isCheckout = (pathname ?? "").startsWith("/checkout");
  const hideStoreFooter = shouldHideStoreFooter(pathname ?? "");
  const isTicketChat = isAccountTicketChatPath(pathname ?? "");
  const supportFabBase = showFloatingNav
    ? "var(--mobile-dock-clearance)"
    : isTicketChat
      ? "var(--account-ticket-chat-bottom, env(safe-area-inset-bottom, 0px))"
      : isCheckout
        ? "env(safe-area-inset-bottom, 0px)"
        : "env(safe-area-inset-bottom, 0px)";

  useEffect(() => {
    const html = document.documentElement;
    const chromePad = showFloatingNav
      ? null
      : isTicketChat
        ? "var(--account-ticket-chat-bottom, env(safe-area-inset-bottom, 0px))"
        : "0px";
    if (chromePad === null) {
      html.style.removeProperty("--scroll-pad-bottom-chrome");
    } else {
      html.style.setProperty("--scroll-pad-bottom-chrome", chromePad);
    }
    if (hideStoreFooter) {
      html.classList.add("commerce-focus-lock");
    }
    return () => {
      html.style.removeProperty("--scroll-pad-bottom-chrome");
      html.classList.remove("commerce-focus-lock");
    };
  }, [showFloatingNav, isTicketChat, hideStoreFooter]);

  if (isBare) {
    return (
      <ThemeProvider>
        <SiteSettingsProvider settings={siteSettings}>
          {children}
        </SiteSettingsProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SiteSettingsProvider settings={siteSettings}>
        {/* Root flex child of body: keeps footer at bottom without letting it grow */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            hideStoreFooter && "h-dvh overflow-hidden",
          )}
          style={{ ["--support-fab-base" as string]: supportFabBase }}
        >
          <Header />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col lg:pb-0",
              hideStoreFooter && "min-h-0 overflow-hidden",
              showFloatingNav
                ? "pb-[var(--mobile-dock-clearance)]"
                : isTicketChat || isCheckout
                  ? "pb-0"
                  : "pb-[env(safe-area-inset-bottom)]",
            )}
          >
            <main
              id="main-content"
              className={cn(
                "flex flex-1 flex-col",
                hideStoreFooter
                  ? "min-h-0 overflow-hidden"
                  : isTicketChat
                    ? "min-h-0"
                    : showFloatingNav
                      ? "min-h-[calc(100dvh-4rem-var(--mobile-dock-clearance))] lg:min-h-[calc(100dvh-4.75rem)]"
                      : "min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] lg:min-h-[calc(100dvh-4.75rem)]",
              )}
            >
              {children}
            </main>
            {isTicketChat || hideStoreFooter ? null : <Footer />}
          </div>
          <MobileDock />
          <CartLiveRegion />
          <CartHoldSync />
          <AbandonedCartChip />
          <SupportFabRoot />
        </div>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

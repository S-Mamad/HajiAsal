"use client";

import { usePathname } from "next/navigation";
import type { SiteConfig } from "@/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileDock } from "@/components/menu";
import { CartLiveRegion } from "@/components/cart/CartLiveRegion";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { shouldShowFloatingNav } from "@/lib/layout/floating-nav";
import { cn } from "@/lib/utils";

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
        <div className="flex min-h-0 flex-1 flex-col">
          <Header />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col lg:pb-0",
              showFloatingNav
                ? "pb-[var(--mobile-dock-clearance)]"
                : "pb-[env(safe-area-inset-bottom)]",
            )}
          >
            <main
              id="main-content"
              className={cn(
                "flex flex-1 flex-col",
                /* Short pages (cart/wishlist): content fills viewport; footer stays below fold */
                showFloatingNav
                  ? "min-h-[calc(100dvh-4rem-var(--mobile-dock-clearance))] lg:min-h-[calc(100dvh-4.75rem)]"
                  : "min-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] lg:min-h-[calc(100dvh-4.75rem)]",
              )}
            >
              {children}
            </main>
            <Footer />
          </div>
          <MobileDock />
          <CartLiveRegion />
        </div>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

"use client";

import { usePathname } from "next/navigation";
import type { SiteConfig } from "@/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingBottomNav } from "@/components/layout/FloatingBottomNav";
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
}

export function StoreChrome({ children, siteSettings }: StoreChromeProps) {
  const pathname = usePathname();
  const isBare = BARE_CHROME.test(pathname ?? "");
  const showFloatingNav = shouldShowFloatingNav(pathname ?? "");

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
        <Header />
        <div
          className={cn(
            "flex flex-1 flex-col lg:pb-0",
            showFloatingNav
              ? "pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
              : "pb-[env(safe-area-inset-bottom)]",
          )}
        >
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
        <FloatingBottomNav />
        <CartLiveRegion />
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

"use client";

import { usePathname } from "next/navigation";
import type { SiteConfig } from "@/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartLiveRegion } from "@/components/cart/CartLiveRegion";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { ThemeProvider } from "@/context/ThemeContext";

const BARE_CHROME =
  /^\/(login|register|forgot-password|admin|seller)(\/|$)/;

interface StoreChromeProps {
  children: React.ReactNode;
  siteSettings: SiteConfig;
}

export function StoreChrome({ children, siteSettings }: StoreChromeProps) {
  const pathname = usePathname();
  const isBare = BARE_CHROME.test(pathname ?? "");

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
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <CartDrawer />
        <CartLiveRegion />
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

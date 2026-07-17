"use client";

import { createContext, useContext, useEffect } from "react";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { useCartStore } from "@/store/cart";

const fallbackSite = site as SiteConfig;

const SiteSettingsContext = createContext<SiteConfig>(fallbackSite);

interface SiteSettingsProviderProps {
  settings: SiteConfig;
  children: React.ReactNode;
}

export function SiteSettingsProvider({
  settings,
  children,
}: SiteSettingsProviderProps) {
  const setShippingConfig = useCartStore((s) => s.setShippingConfig);

  useEffect(() => {
    setShippingConfig({
      shippingCost: settings.shippingCost,
    });
  }, [settings, setShippingConfig]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteConfig {
  return useContext(SiteSettingsContext);
}

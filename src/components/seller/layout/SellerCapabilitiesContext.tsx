"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  canSeller,
  resolveCapabilities,
  type SellerCapabilitiesMap,
  type SellerCapability,
} from "@/lib/seller/capabilities";

const SellerCapabilitiesContext = createContext<SellerCapabilitiesMap | null | undefined>(
  undefined,
);

export function SellerCapabilitiesProvider({
  capabilities,
  children,
}: {
  capabilities?: SellerCapabilitiesMap | null;
  children: ReactNode;
}) {
  return (
    <SellerCapabilitiesContext.Provider value={capabilities}>
      {children}
    </SellerCapabilitiesContext.Provider>
  );
}

export function useSellerCapabilities(): SellerCapabilitiesMap | null | undefined {
  return useContext(SellerCapabilitiesContext);
}

export function useSellerCan(capability: SellerCapability): boolean {
  const caps = useSellerCapabilities();
  return canSeller(caps, capability);
}

export function useResolvedSellerCapabilities() {
  return resolveCapabilities(useSellerCapabilities());
}

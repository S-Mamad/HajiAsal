"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearch } from "./GlobalSearch";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { isTypingTarget, SELLER_SHORTCUTS } from "@/lib/seller/shortcuts";
import { hajiasalPath } from "@/lib/paths";
import { canAccessSellerPath } from "@/lib/seller/nav";
import { useSellerCapabilities } from "@/components/seller/layout/SellerCapabilitiesContext";

export function SellerShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const capabilities = useSellerCapabilities();
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const openHelp = useCallback(() => setHelpOpen(true), []);

  const go = useCallback(
    (href: string) => {
      if (!canAccessSellerPath(capabilities, href)) return;
      router.push(href);
    },
    [capabilities, router],
  );

  useEffect(() => {
    const onSearch = () => openSearch();
    const onHelp = () => openHelp();
    window.addEventListener("seller:open-search", onSearch);
    window.addEventListener("seller:open-help", onHelp);
    return () => {
      window.removeEventListener("seller:open-search", onSearch);
      window.removeEventListener("seller:open-help", onHelp);
    };
  }, [openSearch, openHelp]);

  useEffect(() => {
    setSearchOpen(false);
    setHelpOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openHelp();
        return;
      }

      if (pendingG) {
        setPendingG(false);
        const map: Record<string, string> = {
          d: hajiasalPath("/seller/dashboard"),
          p: hajiasalPath("/seller/products"),
          o: hajiasalPath("/seller/orders"),
          i: hajiasalPath("/seller/inventory"),
          w: hajiasalPath("/seller/wallet"),
        };
        const href = map[e.key.toLowerCase()];
        if (href) {
          e.preventDefault();
          go(href);
        }
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey) {
        setPendingG(true);
        window.setTimeout(() => setPendingG(false), 800);
        return;
      }

      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey) {
        const create = SELLER_SHORTCUTS.find((s) => s.action === "create");
        if (create?.href) {
          e.preventDefault();
          go(create.href);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch, openHelp, pendingG, go]);

  return (
    <>
      {children}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}

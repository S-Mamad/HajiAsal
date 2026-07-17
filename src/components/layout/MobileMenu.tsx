"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Phone,
  Question,
  User,
  Package,
  SignIn,
  SignOut,
} from "@phosphor-icons/react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useAuth } from "@/hooks/useAuth";
import { extraNav, resolveNavHref } from "@/lib/nav";
import { hajiasalPath } from "@/lib/paths";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/utils";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const siteData = useSiteSettings();
  const pathname = usePathname();
  const { user, isLoggedIn, logout, loading } = useAuth();
  const navItems = [...siteData.nav, ...extraNav];
  const [backdropReady, setBackdropReady] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      setBackdropReady(false);
      return;
    }
    const t = window.setTimeout(() => setBackdropReady(true), 320);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overlay-scrim fixed inset-0 z-[80] backdrop-blur-sm lg:hidden"
            onClick={backdropReady ? onClose : undefined}
            aria-hidden
          />
          <motion.nav
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-0 start-0 top-14 z-[90] flex w-[min(100vw-2.5rem,19rem)] flex-col border-e border-border bg-surface shadow-2xl sm:top-16 lg:hidden"
            aria-label="منوی موبایل"
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <BrandLogo name={siteData.brand.name} />
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-secondary transition-colors hover:bg-surface-muted hover:text-gold active:bg-surface-elevated"
                  aria-label="بستن"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {!loading ? (
              <div className="border-b border-border px-3 py-3">
                {isLoggedIn ? (
                  <div className="space-y-0.5">
                    <p className="px-4 pb-2 text-xs text-dim">
                      {user?.fullName || "حساب کاربری"}
                    </p>
                    <Link
                      href={hajiasalPath("/account")}
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-primary hover:bg-surface-muted hover:text-gold"
                    >
                      <User size={16} />
                      حساب من
                    </Link>
                    <Link
                      href={hajiasalPath("/account/orders")}
                      onClick={onClose}
                      className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-primary hover:bg-surface-muted hover:text-gold"
                    >
                      <Package size={16} />
                      سفارش‌های من
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        void logout();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm text-dim hover:bg-surface-muted hover:text-gold"
                    >
                      <SignOut size={16} />
                      خروج
                    </button>
                  </div>
                ) : (
                  <Link
                    href={hajiasalPath("/login")}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-xl bg-gold/10 px-4 py-3.5 text-sm font-medium text-gold"
                  >
                    <SignIn size={16} />
                    ورود / ثبت‌نام
                  </Link>
                )}
              </div>
            ) : null}

            <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-3 py-4">
              {navItems.map((item) => {
                const href = resolveNavHref(item.href);
                const active = pathname === href;
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "block rounded-xl px-4 py-3.5 text-base transition-colors active:bg-surface-elevated",
                        active
                          ? "bg-gold-dim font-medium text-gold"
                          : "text-primary hover:bg-surface-muted hover:text-gold",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto space-y-1 border-t border-border px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Link
                href={hajiasalPath("/faq")}
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-secondary active:bg-surface-muted hover:text-gold"
              >
                <Question size={16} />
                سوالات متداول
              </Link>
              <Link
                href={hajiasalPath("/contact")}
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-secondary active:bg-surface-muted hover:text-gold"
              >
                <Phone size={16} />
                تماس با ما
              </Link>
            </div>
          </motion.nav>
        </>
      ) : null}
    </AnimatePresence>
  );
}

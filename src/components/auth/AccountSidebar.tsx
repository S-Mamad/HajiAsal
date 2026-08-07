"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { SignOut } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import {
  ACCOUNT_NAV_LINKS,
  isAccountNavActive,
} from "@/lib/account/nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type AccountSidebarProps = {
  initialUser?: {
    fullName: string | null;
    phone: string | null;
  } | null;
};

export function AccountSidebar({ initialUser }: AccountSidebarProps) {
  const pathname = usePathname() ?? "";
  const { logout, user, loading } = useAuth();
  const reduceMotion = useReducedMotion();

  const displayName =
    user?.fullName?.trim() ||
    initialUser?.fullName?.trim() ||
    "مشتری حاجی‌عسل";
  const displayPhone = user?.phone || initialUser?.phone || null;
  const initial = displayName.charAt(0) || "ع";

  return (
    <>
      <aside className="hidden w-[15.5rem] shrink-0 xl:w-64 lg:block">
        <div className="sticky top-24 space-y-3">
          <div className="account-surface overflow-hidden rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-dim text-base font-bold text-gold ring-1 ring-gold/15"
                aria-hidden
              >
                {loading && !initialUser ? "…" : initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">
                  {displayName}
                </p>
                {displayPhone ? (
                  <p
                    className="mt-0.5 truncate text-xs tabular-nums text-secondary"
                    dir="ltr"
                  >
                    {displayPhone}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <nav aria-label="منوی حساب کاربری">
            <ul className="account-surface flex flex-col gap-0.5 rounded-2xl border border-border bg-surface p-1.5">
              {ACCOUNT_NAV_LINKS.map((link) => {
                const active = isAccountNavActive(
                  pathname,
                  link.href,
                  link.exact,
                );
                return (
                  <li key={link.href} className="relative">
                    {active ? (
                      <motion.span
                        layoutId={
                          reduceMotion ? undefined : "account-side-active"
                        }
                        aria-hidden
                        className="absolute inset-0 rounded-xl bg-gold-dim ring-1 ring-gold/15"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 420, damping: 34 }
                        }
                      />
                    ) : null}
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative z-[1] flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
                        active
                          ? "font-medium text-gold"
                          : "text-secondary hover:bg-surface-muted/80 hover:text-primary",
                      )}
                    >
                      <Icon
                        icon={link.icon}
                        size={18}
                        weight={active ? "fill" : "regular"}
                      />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
              <li className="mt-1 border-t border-border pt-1">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
                >
                  <Icon icon={SignOut} size={18} />
                  خروج از حساب
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <nav
        aria-label="ناوبری حساب کاربری"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div className="floating-solid-nav pointer-events-auto relative flex h-[4.35rem] w-[min(96%,28rem)] items-stretch justify-between gap-0.5 rounded-[1.25rem] px-1 sm:h-[4.5rem] sm:rounded-[1.35rem] sm:px-1.5">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-0 z-[1] h-px bg-gradient-to-l from-transparent via-gold/35 to-transparent"
          />
          {ACCOUNT_NAV_LINKS.map((link) => {
            const active = isAccountNavActive(
              pathname,
              link.href,
              link.exact,
            );
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative z-[1] flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 touch-manipulation",
                  "transition-colors duration-200 active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-inset",
                  active ? "text-gold" : "text-secondary/75",
                )}
              >
                <span className="relative flex h-8 w-8 items-center justify-center">
                  {active ? (
                    <motion.span
                      layoutId={
                        reduceMotion ? undefined : "account-nav-active"
                      }
                      aria-hidden
                      className="absolute inset-0 rounded-[0.65rem] bg-gold/[0.14] ring-1 ring-gold/20 dark:bg-gold/[0.2]"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 480, damping: 36 }
                      }
                    />
                  ) : null}
                  <Icon
                    icon={link.icon}
                    size={18}
                    weight={active ? "fill" : "regular"}
                    className="relative z-[1]"
                  />
                </span>
                <span
                  className={cn(
                    "relative max-w-full truncate text-[9px] leading-none sm:text-[10px]",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {link.shortLabel}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-1.5 mx-auto h-0.5 w-2.5 rounded-full bg-gold/70"
                    />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

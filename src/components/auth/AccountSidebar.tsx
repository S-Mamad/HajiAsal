"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, SignOut } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import {
  ACCOUNT_NAV_LINKS,
  ACCOUNT_MOBILE_NAV_LINKS,
  ACCOUNT_STORE_LINK,
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
      {/* Desktop sidebar */}
      <aside className="hidden w-[16rem] shrink-0 xl:w-[17rem] lg:block">
        <div className="sticky top-24 space-y-4">
          <Link
            href={ACCOUNT_STORE_LINK.href}
            className="group flex items-center gap-2.5 rounded-xl px-1 py-1 text-sm text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-gold transition-[border-color,transform] duration-200 group-hover:border-gold/25 group-hover:scale-[1.03]">
              <Icon icon={ACCOUNT_STORE_LINK.icon} size={16} weight="duotone" />
            </span>
            <span className="font-medium">{ACCOUNT_STORE_LINK.label}</span>
            <ArrowRight
              size={14}
              className="ms-auto opacity-40 transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:opacity-70"
              aria-hidden
            />
          </Link>

          <div className="account-surface overflow-hidden rounded-2xl border border-border/90 bg-surface p-5">
            <div className="flex items-center gap-3.5">
              <div
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-dim to-gold/[0.06] text-lg font-bold text-gold ring-1 ring-gold/20"
                aria-hidden
              >
                {loading && !initialUser ? "…" : initial}
                <span className="absolute -inset-px rounded-2xl ring-1 ring-inset ring-white/10" />
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
                ) : (
                  <p className="mt-0.5 text-xs text-dim">حساب کاربری</p>
                )}
              </div>
            </div>
          </div>

          <nav aria-label="منوی حساب کاربری">
            <ul className="flex flex-col gap-0.5">
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
                        className="absolute inset-0 rounded-xl bg-gold-dim/80 ring-1 ring-gold/12"
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
                        "relative z-[1] flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
                        active
                          ? "font-medium text-gold"
                          : "text-secondary hover:bg-surface-muted/60 hover:text-primary",
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
            </ul>
          </nav>

          <div className="border-t border-border/70 pt-3">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-secondary transition-colors hover:bg-surface-muted/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45 focus-visible:ring-offset-2 focus-visible:ring-offset-void"
            >
              <Icon icon={SignOut} size={18} />
              خروج از حساب
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        aria-label="ناوبری حساب کاربری"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div className="account-mobile-nav pointer-events-auto relative flex h-[4.25rem] w-[min(96%,26rem)] items-stretch justify-between gap-0.5 rounded-[1.2rem] px-1 sm:h-[4.4rem] sm:rounded-[1.3rem] sm:px-1.5">
          <Link
            href={ACCOUNT_STORE_LINK.href}
            className={cn(
              "relative z-[1] flex min-h-11 min-w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 touch-manipulation",
              "text-secondary/80 transition-colors duration-200 active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:ring-inset",
            )}
            aria-label={ACCOUNT_STORE_LINK.label}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[0.65rem] border border-border/80 bg-surface-elevated/80">
              <Icon icon={ACCOUNT_STORE_LINK.icon} size={17} weight="duotone" />
            </span>
            <span className="max-w-full truncate text-[9px] font-medium leading-none sm:text-[10px]">
              {ACCOUNT_STORE_LINK.shortLabel}
            </span>
          </Link>

          <span
            aria-hidden
            className="my-3 w-px shrink-0 bg-border/80"
          />

          {ACCOUNT_MOBILE_NAV_LINKS.map((link) => {
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
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

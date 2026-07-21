"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, SignOut, Package, CaretDown } from "@phosphor-icons/react";
import { useAuth } from "@/hooks/useAuth";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  className?: string;
  /** Compact icon-only (header mobile) */
  compact?: boolean;
}

export function UserMenu({ className, compact = false }: UserMenuProps) {
  const { user, loading, logout, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const btnClass = cn(
    "flex h-11 items-center justify-center gap-1 rounded-xl text-sm text-secondary transition-colors hover:bg-surface-muted hover:text-gold active:bg-surface-elevated touch-manipulation",
    compact ? "w-11 px-0" : "px-2.5",
    className,
  );

  if (loading) {
    return (
      <div className={cn(btnClass, "w-11")} aria-hidden>
        <Icon icon={User} size={18} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        href={hajiasalPath("/login")}
        className={btnClass}
        aria-label="ورود به حساب"
      >
        <Icon icon={User} size={18} />
        {!compact ? (
          <span className="hidden sm:inline">ورود</span>
        ) : null}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={btnClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="حساب کاربری"
      >
        <Icon icon={User} size={18} />
        {!compact ? (
          <span className="hidden max-w-[5rem] truncate sm:inline">
            {user?.fullName?.split(" ")[0] ?? "حساب"}
          </span>
        ) : null}
        <Icon icon={CaretDown} size={12} className={cn(!compact && "hidden sm:block", compact && "hidden")} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 min-w-[11rem] rounded-xl border border-border-bright bg-surface py-1.5 shadow-2xl"
        >
          <Link
            href={hajiasalPath("/account")}
            role="menuitem"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-surface-muted hover:text-gold"
            onClick={() => setOpen(false)}
          >
            <Icon icon={User} size={16} />
            حساب من
          </Link>
          <Link
            href={hajiasalPath("/account/orders")}
            role="menuitem"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-primary hover:bg-surface-muted hover:text-gold"
            onClick={() => setOpen(false)}
          >
            <Icon icon={Package} size={16} />
            سفارش‌ها
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-dim hover:bg-surface-muted hover:text-gold"
            onClick={() => void logout()}
          >
            <Icon icon={SignOut} size={16} />
            خروج
          </button>
        </div>
      ) : null}
    </div>
  );
}

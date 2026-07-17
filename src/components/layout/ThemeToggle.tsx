"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact = true }: ThemeToggleProps) {
  const { theme, toggleTheme, ready } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!ready}
      className={cn(
        "flex items-center justify-center rounded-xl text-secondary transition-colors hover:bg-surface-muted hover:text-gold active:bg-surface-elevated touch-manipulation",
        compact ? "h-11 w-11" : "h-11 gap-2 px-3 text-sm",
        className,
      )}
      aria-label={isDark ? "فعال‌سازی حالت روز" : "فعال‌سازی حالت شب"}
      title={isDark ? "حالت روز" : "حالت شب"}
    >
      {!ready ? (
        <span className="h-[18px] w-[18px] rounded-full bg-surface-muted" aria-hidden />
      ) : isDark ? (
        <Sun size={18} weight="duotone" className="text-gold" />
      ) : (
        <Moon size={18} weight="duotone" />
      )}
      {!compact ? (
        <span>{isDark ? "حالت روز" : "حالت شب"}</span>
      ) : null}
    </button>
  );
}

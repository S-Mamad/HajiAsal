"use client";

import Link from "next/link";
import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AdminButtonVariant = "primary" | "outline" | "ghost" | "danger";
type AdminButtonSize = "sm" | "md";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  children: ReactNode;
  /** Use native <a> for downloads / API exports */
  external?: boolean;
  target?: string;
  download?: boolean | string;
}

const variants: Record<AdminButtonVariant, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-400 active:scale-[0.98]",
  outline:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 active:scale-[0.98]",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 active:scale-[0.98]",
  danger: "bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]",
};

const sizes: Record<AdminButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export function AdminButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  external = false,
  target,
  download,
  disabled,
  ...props
}: AdminButtonProps) {
  const styles = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/30 focus-visible:ring-offset-2",
    "disabled:pointer-events-none",
    sizes[size],
    variants[variant],
    className,
  );

  if (href && !disabled) {
    if (external) {
      return (
        <a
          href={href}
          className={styles}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          download={download}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={styles} onClick={props.onClick as never}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={styles} disabled={disabled} {...props}>
      {children}
    </button>
  );
}

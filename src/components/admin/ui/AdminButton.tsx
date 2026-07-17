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
    "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400",
  outline:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white hover:bg-red-500",
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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
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

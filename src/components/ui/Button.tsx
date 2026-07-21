"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { type ReactNode, type MouseEventHandler } from "react";
import { cn } from "@/lib/utils";
import { useMagneticHover } from "@/hooks/useMagneticHover";

interface ButtonProps {
  href?: string;
  variant?: "primary" | "ghost" | "outline";
  size?: "default" | "lg" | "sm";
  magnetic?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
  className?: string;
}

export function Button({
  href,
  variant = "primary",
  size = "default",
  magnetic = false,
  disabled = false,
  type = "button",
  onClick,
  children,
  className,
}: ButtonProps) {
  const { ref, springX, springY, onMouseMove, onMouseLeave } =
    useMagneticHover(0.15);

  const styles = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" &&
      "bg-gold text-ink-on-gold shadow-gold-glow hover:bg-gold-bright active:scale-[0.98]",
    variant === "ghost" && "text-secondary hover:bg-surface-muted hover:text-gold",
    variant === "outline" &&
      "border border-border-bright text-primary hover:border-gold/50 hover:bg-surface-muted",
    size === "sm" && "h-9 px-4 text-sm",
    size === "default" && "h-11 px-6 text-sm",
    size === "lg" && "h-12 px-8 text-base md:h-14",
    className,
  );

  const content = magnetic ? (
    <motion.span
      style={{ x: springX, y: springY }}
      className="inline-flex items-center justify-center gap-2"
    >
      {children}
    </motion.span>
  ) : (
    children
  );

  if (href) {
    if (magnetic) {
      return (
        <div
          ref={ref}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className="inline-block"
        >
          <Link href={href} className={styles} onClick={onClick}>
            {content}
          </Link>
        </div>
      );
    }
    return (
      <Link href={href} className={styles} onClick={onClick}>
        {content}
      </Link>
    );
  }

  if (magnetic) {
    return (
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={cn("inline-block", className?.includes("w-full") && "w-full")}
      >
        <button
          type={type}
          disabled={disabled}
          onClick={onClick}
          className={styles}
        >
          {content}
        </button>
      </div>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={styles}
    >
      {content}
    </button>
  );
}

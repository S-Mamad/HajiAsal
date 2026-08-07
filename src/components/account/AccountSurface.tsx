import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AccountSurfaceProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  padded?: boolean;
  interactive?: boolean;
};

export function AccountSurface({
  children,
  className,
  as: Tag = "div",
  padded = true,
  interactive = false,
}: AccountSurfaceProps) {
  return (
    <Tag
      className={cn(
        "account-surface overflow-hidden rounded-2xl border border-border bg-surface",
        padded && "p-4 sm:p-5",
        interactive &&
          "transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-gold/30 hover:bg-gold/[0.03] active:scale-[0.995]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

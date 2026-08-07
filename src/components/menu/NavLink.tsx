import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavLinkProps } from "./types";

export function NavLink({
  href,
  label,
  active = false,
  onNavigate,
  className,
  activeClassName,
  inactiveClassName,
}: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        className,
        active ? activeClassName : inactiveClassName,
      )}
    >
      {label}
    </Link>
  );
}

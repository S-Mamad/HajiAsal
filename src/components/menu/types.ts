import type { ComponentType } from "react";
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import type { NavItem as SiteNavItem } from "@/types";

/** Phosphor icon component accepted by menu UI. */
export type MenuIcon = ComponentType<PhosphorIconProps>;

/**
 * Raw nav entry from site settings / extraNav.
 * Same shape as domain `NavItem` (`id`, `label`, `href`).
 */
export type MenuNavSource = SiteNavItem;

/** Nav entry after `resolveNavHref` — ready for Link `href`. */
export interface ResolvedMenuNavItem {
  id: string;
  label: string;
  href: string;
}

export type DockBadge = "cart";

/** Mobile bottom-dock tab definition. */
export interface DockNavItem {
  id: string;
  label: string;
  href: string;
  icon: MenuIcon;
  /** Returns true when this tab should appear active for the given pathname. */
  match: (pathname: string) => boolean;
  badge?: DockBadge;
}

export interface NavLinkProps {
  href: string;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
}

export interface DesktopNavProps {
  items: ResolvedMenuNavItem[];
  pathname: string | null;
  className?: string;
  "aria-label"?: string;
}

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  items: ResolvedMenuNavItem[];
}

export interface UserAccountMenuProps {
  className?: string;
  /** Icon-only trigger (header). */
  compact?: boolean;
}

export interface MobileDockProps {
  items?: DockNavItem[];
}

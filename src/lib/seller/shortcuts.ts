import { hajiasalPath } from "@/lib/paths";

export type SellerShortcut = {
  keys: string;
  description: string;
  href?: string;
  action?: "search" | "help" | "create";
};

export const SELLER_SHORTCUTS: SellerShortcut[] = [
  { keys: "Ctrl+K", description: "جستجوی سراسری", action: "search" },
  { keys: "?", description: "راهنمای میانبرها", action: "help" },
  {
    keys: "G D",
    description: "داشبورد",
    href: hajiasalPath("/seller/dashboard"),
  },
  {
    keys: "G P",
    description: "محصولات",
    href: hajiasalPath("/seller/products"),
  },
  {
    keys: "G O",
    description: "سفارشات",
    href: hajiasalPath("/seller/orders"),
  },
  {
    keys: "G I",
    description: "موجودی",
    href: hajiasalPath("/seller/inventory"),
  },
  {
    keys: "G W",
    description: "کیف پول",
    href: hajiasalPath("/seller/wallet"),
  },
  {
    keys: "N",
    description: "محصول جدید",
    href: hajiasalPath("/seller/products/new"),
    action: "create",
  },
];

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

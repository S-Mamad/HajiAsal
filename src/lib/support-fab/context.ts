import {
  CART_ASSIST_COPY,
  CHECKOUT_ASSIST_COPY,
  DEFAULT_WELCOME_COPY,
  OOS_ASSIST_COPY,
  RAGE_ASSIST_COPY,
} from "./constants";

export type SupportPageKind =
  | "home"
  | "shop"
  | "product"
  | "cart"
  | "checkout"
  | "account"
  | "orders"
  | "tickets"
  | "other";

export type SupportFabIconKind = "headset" | "package" | "moon" | "offline";

export function classifyPathname(pathname: string): SupportPageKind {
  const p = pathname || "/";
  if (p.startsWith("/account/tickets")) return "tickets";
  if (p.startsWith("/account/orders")) return "orders";
  if (p.startsWith("/account")) return "account";
  if (p.startsWith("/checkout")) return "checkout";
  if (p.startsWith("/cart")) return "cart";
  if (p.startsWith("/product/")) return "product";
  if (p.startsWith("/shop")) return "shop";
  if (p === "/") return "home";
  return "other";
}

export function shouldMountSupportFab(pathname: string): boolean {
  const p = pathname || "/";
  if (/^\/(login|register|forgot-password|admin|seller)(\/|$)/.test(p)) {
    return false;
  }
  const kind = classifyPathname(p);
  if (kind === "tickets" || kind === "checkout") return false;
  return true;
}

export function pageKindLabel(kind: SupportPageKind): string {
  switch (kind) {
    case "cart":
      return "صفحه سبد خرید";
    case "checkout":
      return "صفحه پرداخت";
    case "product":
      return "صفحه محصول";
    case "account":
      return "داشبورد کاربری";
    case "orders":
      return "صفحه سفارش‌ها";
    case "shop":
      return "فروشگاه";
    case "home":
      return "صفحه اصلی";
    case "tickets":
      return "صفحه پشتیبانی";
    default:
      return "سایت";
  }
}

export function contextualTooltip(input: {
  pageKind: SupportPageKind;
  productOutOfStock: boolean;
  rageAssist: boolean;
  cartDwellElapsed: boolean;
}): string {
  if (input.rageAssist) return RAGE_ASSIST_COPY;
  if (input.pageKind === "product" && input.productOutOfStock) {
    return OOS_ASSIST_COPY;
  }
  if (input.pageKind === "cart" && input.cartDwellElapsed) {
    return CART_ASSIST_COPY;
  }
  if (input.pageKind === "checkout") return CHECKOUT_ASSIST_COPY;
  return DEFAULT_WELCOME_COPY;
}

export function ticketSubjectForContext(input: {
  pageKind: SupportPageKind;
  productOutOfStock: boolean;
  hasShippingOrder: boolean;
}): string {
  if (input.hasShippingOrder) return "پیگیری سفارش در حال ارسال";
  if (input.pageKind === "product" && input.productOutOfStock) {
    return "موجودی محصول";
  }
  if (input.pageKind === "cart") return "کمک در ثبت سفارش";
  if (input.pageKind === "checkout") return "کمک در پرداخت";
  return "گفتگو با پشتیبانی";
}

export function resolveFabIcon(_input: {
  online: boolean;
  withinHours: boolean;
  hasShippingOrder: boolean;
  pageKind: SupportPageKind;
}): SupportFabIconKind {
  return "headset";
}

export function fabAriaLabel(input: {
  unread: boolean;
  online: boolean;
  withinHours: boolean;
}): string {
  if (!input.online) {
    return "پشتیبانی حاجی‌عسل، اتصال اینترنت قطع است";
  }
  if (input.unread) {
    return "پشتیبانی حاجی‌عسل، شما یک پیام جدید دارید.";
  }
  if (!input.withinHours) {
    return "پشتیبانی حاجی‌عسل، پشتیبانی الان آنلاین نیست";
  }
  return "پشتیبانی حاجی‌عسل";
}

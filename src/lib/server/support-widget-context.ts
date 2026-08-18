import { getOrdersByUserId, PAID_OR_FULFILLING } from "@/lib/server/orders";
import { classifyPathname, type SupportPageKind } from "@/lib/support-fab/context";
import { buildVipSummary, isHighValueAccount } from "@/lib/support-fab/vip";

const SHIPPING_STATUSES = new Set(["processing", "shipped"]);

export async function buildCustomerValueContext(input: {
  userId: string;
  fullName?: string | null;
  pageKind?: SupportPageKind;
  currentUrl?: string;
}): Promise<{
  pageKind: SupportPageKind;
  pendingPaymentCount: number;
  shippingOrderId: string | null;
  accountValue: number;
  vip: boolean;
  vipSummary: string;
}> {
  const pageKind =
    input.pageKind ??
    classifyPathname(safePathname(input.currentUrl));

  let pendingPaymentCount = 0;
  let shippingOrderId: string | null = null;
  let accountValue = 0;
  try {
    const orders = await getOrdersByUserId(input.userId);
    pendingPaymentCount = orders.filter(
      (order) => order.status === "pending_payment",
    ).length;
    const shipping = orders.find((order) => SHIPPING_STATUSES.has(order.status));
    shippingOrderId = shipping?.id ?? null;
    accountValue = orders
      .filter((order) => PAID_OR_FULFILLING.has(order.status))
      .reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  } catch {
    /* Ticket create must not fail if order lookup is down. */
  }

  const vip = isHighValueAccount(accountValue);
  return {
    pageKind,
    pendingPaymentCount,
    shippingOrderId,
    accountValue,
    vip,
    vipSummary: buildVipSummary({
      fullName: input.fullName,
      pageKind,
      pendingPaymentCount,
      accountValue,
    }),
  };
}

function safePathname(url?: string): string {
  if (!url) return "/";
  try {
    return new URL(url, "https://hajiasal.ir").pathname;
  } catch {
    return url.startsWith("/") ? url : "/";
  }
}

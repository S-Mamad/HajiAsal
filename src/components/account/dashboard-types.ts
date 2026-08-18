import { hajiasalPath } from "@/lib/paths";
import { PENDING_ORDER_TTL_MS } from "@/lib/order-pending";

export type DashboardPendingItem = {
  productId: string;
  title: string;
  image: string;
  weightGrams: number;
};

export type DashboardPendingOrder = {
  id: string;
  createdAt: string;
  total: number;
  items: DashboardPendingItem[];
};

export type DashboardOrderCounts = {
  active: number;
  pendingPayment: number;
  delivered: number;
  cancelled: number;
};

export { PENDING_ORDER_TTL_MS };

/** Resume unpaid order — checkout auto-starts gateway (not a failed bounce). */
export function pendingOrderResumeHref(orderId: string): string {
  return `${hajiasalPath("/checkout")}?payment=resume&orderId=${encodeURIComponent(orderId)}`;
}

export function getNameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2) || "؟";
  const a = (parts[0] ?? "").charAt(0);
  const b = (parts[1] ?? "").charAt(0);
  return `${a} ${b}`.trim();
}

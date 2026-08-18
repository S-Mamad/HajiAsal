import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { getOrdersByUserId } from "@/lib/server/orders";
import { AccountDashboardClient } from "@/components/account/AccountDashboardClient";
import {
  getNameInitials,
  type DashboardOrderCounts,
  type DashboardPendingOrder,
} from "@/components/account/dashboard-types";

export default async function AccountPage() {
  const session = await getSessionFromCookies();
  const profile = session ? await findProfileById(session.userId) : null;
  const orders = session ? await getOrdersByUserId(session.userId) : [];

  const displayName = profile?.fullName?.trim() || "مشتری عزیز";
  const phone = profile?.phone ?? "";

  const pendingOrders: DashboardPendingOrder[] = orders
    .filter((o) => o.status === "pending_payment")
    .map((o) => ({
      id: o.id,
      createdAt: o.createdAt,
      total: o.total,
      items: o.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        image: item.image,
        weightGrams: item.weight.grams,
      })),
    }));

  const counts: DashboardOrderCounts = {
    active: orders.filter(
      (o) =>
        o.status === "confirmed" ||
        o.status === "processing" ||
        o.status === "shipped",
    ).length,
    pendingPayment: pendingOrders.length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <AccountDashboardClient
      displayName={displayName}
      initials={getNameInitials(displayName)}
      phone={phone}
      pendingOrders={pendingOrders}
      counts={counts}
      hasAnyOrders={orders.length > 0}
    />
  );
}

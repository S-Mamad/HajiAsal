"use client";

import { useState } from "react";
import { ProfileHero } from "@/components/account/ProfileHero";
import { PendingPaymentAlert } from "@/components/account/PendingPaymentAlert";
import { OrdersStatusMatrix } from "@/components/account/OrdersStatusMatrix";
import { AccountQuickLinks } from "@/components/account/AccountQuickLinks";
import { PendingPaymentSheet } from "@/components/account/PendingPaymentSheet";
import type {
  DashboardOrderCounts,
  DashboardPendingOrder,
} from "@/components/account/dashboard-types";
import { isPendingOrderExpired } from "@/components/account/OrderExpiryPill";

export interface AccountDashboardClientProps {
  displayName: string;
  initials: string;
  phone: string;
  addressSummary?: string | null;
  pendingOrders: DashboardPendingOrder[];
  counts: DashboardOrderCounts;
  hasAnyOrders: boolean;
}

export function AccountDashboardClient({
  displayName,
  initials,
  phone,
  addressSummary = null,
  pendingOrders,
  counts,
  hasAnyOrders,
}: AccountDashboardClientProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingCount = pendingOrders.length;
  const payableCount = pendingOrders.filter(
    (o) => !isPendingOrderExpired(o.createdAt),
  ).length;

  const openSheet = () => setSheetOpen(true);

  return (
    <>
      <div className="account-dashboard flex flex-col gap-6">
        <ProfileHero
          displayName={displayName}
          initials={initials}
          phone={phone}
          addressSummary={addressSummary}
        />

        {pendingCount > 0 ? (
          <PendingPaymentAlert
            count={pendingCount}
            payableCount={payableCount}
            onOpen={openSheet}
          />
        ) : null}

        <OrdersStatusMatrix
          counts={counts}
          onPendingPress={pendingCount > 0 ? openSheet : undefined}
          showEmptyHint={!hasAnyOrders}
        />

        <AccountQuickLinks />
      </div>

      <PendingPaymentSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        orders={pendingOrders}
      />
    </>
  );
}

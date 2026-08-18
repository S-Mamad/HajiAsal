"use client";

import { useState } from "react";
import Link from "next/link";
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
import { hajiasalPath } from "@/lib/paths";

export interface AccountDashboardClientProps {
  displayName: string;
  initials: string;
  phone: string;
  pendingOrders: DashboardPendingOrder[];
  counts: DashboardOrderCounts;
  hasAnyOrders: boolean;
}

export function AccountDashboardClient({
  displayName,
  initials,
  phone,
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
      <div className="account-dashboard flex flex-col gap-5">
        <ProfileHero
          displayName={displayName}
          initials={initials}
          phone={phone}
        />

        {pendingCount > 0 ? (
          <PendingPaymentAlert
            count={pendingCount}
            payableCount={payableCount}
            onOpen={openSheet}
          />
        ) : null}

        <div>
          <OrdersStatusMatrix
            counts={counts}
            onPendingPress={pendingCount > 0 ? openSheet : undefined}
          />
          {!hasAnyOrders ? (
            <p className="mt-2.5 px-1 text-[13px] leading-6 text-secondary">
              هنوز سفارشی ثبت نشده.{" "}
              <Link
                href={hajiasalPath("/shop")}
                className="font-medium text-gold hover:text-primary"
              >
                رفتن به فروشگاه
              </Link>
            </p>
          ) : null}
        </div>

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

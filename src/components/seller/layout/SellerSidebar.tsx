"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOut, Storefront } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { getSellerNavGroups } from "@/lib/seller/nav";
import type { SellerCapabilitiesMap } from "@/lib/seller/capabilities";

type SellerBadgeKey =
  | "orders"
  | "tickets"
  | "notifications"
  | "inventory"
  | "products";

export function SellerSidebar({
  shopName,
  onNavigate,
  capabilities,
  badges: badgesProp,
}: {
  shopName?: string;
  onNavigate?: () => void;
  capabilities?: SellerCapabilitiesMap | null;
  badges?: Partial<Record<SellerBadgeKey, number>>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = getSellerNavGroups(capabilities);
  const [badges, setBadges] = useState<Partial<Record<SellerBadgeKey, number>>>(
    badgesProp ?? {},
  );

  useEffect(() => {
    if (badgesProp) {
      setBadges(badgesProp);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/seller/dashboard", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          kpis?: {
            pendingOrders?: number;
            lowStockCount?: number;
            outOfStock?: number;
            pendingProducts?: number;
          };
          navBadges?: Partial<Record<SellerBadgeKey, number>>;
        };
        if (cancelled) return;
        setBadges({
          orders: data.navBadges?.orders ?? data.kpis?.pendingOrders ?? 0,
          inventory:
            data.navBadges?.inventory ??
            data.kpis?.lowStockCount ??
            data.kpis?.outOfStock ??
            0,
          products: data.navBadges?.products ?? data.kpis?.pendingProducts ?? 0,
          tickets: data.navBadges?.tickets ?? 0,
          notifications: data.navBadges?.notifications ?? 0,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [badgesProp]);

  const logout = async () => {
    await fetch("/api/seller/auth", { method: "DELETE" });
    router.push(hajiasalPath("/seller"));
    router.refresh();
  };

  return (
    <aside className="flex h-full w-[15.5rem] shrink-0 flex-col border-e border-[var(--panel-sidebar-border)] bg-[var(--panel-sidebar)] text-zinc-100 pb-[env(safe-area-inset-bottom)]">
      <div className="border-b border-[var(--panel-sidebar-border)] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--panel-radius-sm)] bg-[var(--panel-accent)] text-white">
            <Icon icon={Storefront} size={18} weight="fill" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-500">پنل فروشنده</p>
            <h1 className="truncate text-sm font-semibold tracking-tight text-white">
              {shopName ?? "حاجی عسل"}
            </h1>
          </div>
        </div>
      </div>

      <nav className="panel-scrollbar flex-1 overflow-y-auto px-2.5 py-3">
        {groups.map((group) => (
          <div key={group.id} className="mb-3">
            <p className="mb-1 px-2.5 text-[10px] font-medium text-zinc-600">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const badge =
                  item.badgeKey && badges?.[item.badgeKey]
                    ? badges[item.badgeKey]
                    : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      data-active={active}
                      className="panel-nav-item"
                    >
                      <Icon
                        icon={item.icon}
                        size={17}
                        className="shrink-0 opacity-90"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {badge && badge > 0 ? (
                        <span className="rounded-md bg-rose-600/90 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-[var(--panel-sidebar-border)] p-2.5">
        <Link
          href={hajiasalPath("/shop")}
          onClick={onNavigate}
          className="panel-nav-item"
        >
          <Icon icon={Storefront} size={17} />
          مشاهده فروشگاه
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className={cn(
            "panel-nav-item w-full",
            "hover:bg-rose-950/40 hover:text-rose-200",
          )}
        >
          <Icon icon={SignOut} size={17} />
          خروج
        </button>
      </div>
    </aside>
  );
}

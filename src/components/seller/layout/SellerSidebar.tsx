"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOut, Storefront } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { getSellerNavGroups } from "@/lib/seller/nav";
import type { SellerCapabilitiesMap } from "@/lib/seller/capabilities";

export function SellerSidebar({
  shopName,
  onNavigate,
  capabilities,
  badges,
}: {
  shopName?: string;
  onNavigate?: () => void;
  capabilities?: SellerCapabilitiesMap | null;
  badges?: Partial<Record<"orders" | "tickets" | "notifications" | "inventory" | "products", number>>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = getSellerNavGroups(capabilities);

  const logout = async () => {
    await fetch("/api/seller/auth", { method: "DELETE" });
    router.push(hajiasalPath("/seller"));
    router.refresh();
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-e border-amber-900/20 bg-[#1c1714] text-[#f8f6f3] pb-[env(safe-area-inset-bottom)]">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-[11px] font-medium tracking-wider text-amber-200/70">
          پنل فروشنده
        </p>
        <h1 className="mt-1 truncate text-lg font-semibold">
          {shopName ?? "حاجی عسل"}
        </h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <p className="mb-1.5 px-3 text-[10px] font-medium tracking-wider text-stone-500 uppercase">
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
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-amber-500/20 font-medium text-amber-100"
                          : "text-stone-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon icon={item.icon} size={18} />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {badge && badge > 0 ? (
                        <span className="rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
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

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href={hajiasalPath("/shop")}
          onClick={onNavigate}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-300 hover:bg-white/5 hover:text-white"
        >
          <Icon icon={Storefront} size={18} />
          مشاهده فروشگاه
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-300 hover:bg-white/5 hover:text-white"
        >
          <Icon icon={SignOut} size={18} />
          خروج
        </button>
      </div>
    </aside>
  );
}

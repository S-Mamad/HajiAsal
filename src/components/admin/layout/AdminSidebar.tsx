"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SquaresFour,
  Package,
  ShoppingBag,
  Tag,
  Warehouse,
  Users,
  Star,
  Ticket,
  Envelope,
  Newspaper,
  Article,
  ChartBar,
  Gear,
  Storefront,
  SignOut,
  Handshake,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: hajiasalPath("/admin/dashboard"), label: "داشبورد", icon: SquaresFour },
  { href: hajiasalPath("/admin/orders"), label: "سفارش‌ها", icon: Package },
  { href: hajiasalPath("/admin/products"), label: "محصولات", icon: ShoppingBag },
  { href: hajiasalPath("/admin/sellers"), label: "فروشندگان", icon: Handshake },
  { href: hajiasalPath("/admin/categories"), label: "دسته‌بندی‌ها", icon: Tag },
  { href: hajiasalPath("/admin/inventory"), label: "موجودی", icon: Warehouse },
  { href: hajiasalPath("/admin/customers"), label: "مشتریان", icon: Users },
  { href: hajiasalPath("/admin/reviews"), label: "نظرات", icon: Star },
  { href: hajiasalPath("/admin/coupons"), label: "کوپن‌ها", icon: Ticket },
  { href: hajiasalPath("/admin/messages"), label: "پیام‌ها", icon: Envelope },
  { href: hajiasalPath("/admin/newsletter"), label: "خبرنامه", icon: Newspaper },
  { href: hajiasalPath("/admin/content"), label: "محتوا", icon: Article },
  { href: hajiasalPath("/admin/reports"), label: "گزارش‌ها", icon: ChartBar },
  { href: hajiasalPath("/admin/settings"), label: "تنظیمات", icon: Gear },
  { href: hajiasalPath("/"), label: "فروشگاه", icon: Storefront },
] as const;

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push(hajiasalPath("/admin"));
    router.refresh();
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-e border-slate-200 bg-slate-900 text-slate-100 pb-[env(safe-area-inset-bottom)]">
      <div className="border-b border-slate-700 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          حاجی‌عسل
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">پنل مدیریت</h1>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== hajiasalPath("/") &&
                pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-slate-700 font-medium text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon icon={item.icon} size={18} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-700 p-3">
        <Link
          href={hajiasalPath("/seller")}
          onClick={onNavigate}
          className="mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-amber-300/90 transition-colors hover:bg-slate-800"
        >
          <Icon icon={Storefront} size={18} />
          پنل فروشنده
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <Icon icon={SignOut} size={18} />
          خروج
        </button>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { useAdminAuth } from "@/components/admin/auth/AdminAuthProvider";
import { filterNavForRole } from "@/lib/admin/nav";
import { ADMIN_ROLE_LABELS, type AdminRole } from "@/lib/admin/permissions";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, loading } = useAdminAuth();
  const groups = filterNavForRole(role ?? "super_admin");

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push(hajiasalPath("/admin"));
    router.refresh();
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-e border-stone-800 bg-[#1c1917] text-stone-100 pb-[env(safe-area-inset-bottom)]">
      <div className="border-b border-stone-800 px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-500/90">
          حاجی‌عسل
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">پنل مدیریت</h1>
        {!loading && (user || role) ? (
          <p className="mt-2 truncate text-xs text-stone-400">
            {user?.fullName ?? "مدیر"} ·{" "}
            {role ? ADMIN_ROLE_LABELS[role as AdminRole] : "—"}
          </p>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.id} className="mb-4">
            <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-stone-500">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
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
                          ? "bg-amber-700/25 font-medium text-amber-100"
                          : "text-stone-300 hover:bg-stone-800 hover:text-white",
                      )}
                    >
                      <Icon icon={item.icon} size={18} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-800 p-3">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
        >
          <Icon icon={SignOut} size={18} />
          خروج
        </button>
      </div>
    </aside>
  );
}

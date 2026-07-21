"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { useAdminAuth } from "@/components/admin/auth/AdminAuthProvider";
import { filterNavForRole } from "@/lib/admin/nav";
import { ADMIN_ROLE_LABELS, type AdminRole } from "@/lib/admin/permissions";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

type BadgeMap = Partial<Record<"tickets" | "messages" | "qa", number>>;

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, user, loading } = useAdminAuth();
  const groups = filterNavForRole(role ?? "super_admin");
  const [badges, setBadges] = useState<BadgeMap>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/dashboard", {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          kpis?: { unreadMessages?: number };
          navBadges?: BadgeMap;
        };
        if (cancelled) return;
        setBadges({
          messages: json.navBadges?.messages ?? json.kpis?.unreadMessages ?? 0,
          tickets: json.navBadges?.tickets ?? 0,
          qa: json.navBadges?.qa ?? 0,
        });
      } catch {
        /* ignore badge fetch errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push(hajiasalPath("/admin"));
    router.refresh();
  };

  const roleLabel = role
    ? ADMIN_ROLE_LABELS[role as AdminRole] ?? String(role)
    : null;

  return (
    <aside className="flex h-full w-[15.5rem] shrink-0 flex-col border-e border-[var(--panel-sidebar-border)] bg-[var(--panel-sidebar)] text-zinc-100 pb-[env(safe-area-inset-bottom)]">
      <div className="border-b border-[var(--panel-sidebar-border)] px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[var(--panel-radius-sm)] bg-[var(--panel-accent)] text-xs font-bold text-white">
            حا
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              حاجی‌عسل
            </p>
            <p className="text-[11px] text-zinc-500">پنل مدیریت</p>
          </div>
        </div>
        {!loading && (user || role) ? (
          <div className="mt-3 rounded-[var(--panel-radius-sm)] border border-white/5 bg-white/[0.03] px-2.5 py-2">
            <p className="truncate text-xs font-medium text-zinc-200">
              {user?.fullName ?? "مدیر"}
            </p>
            {roleLabel ? (
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {roleLabel}
              </p>
            ) : null}
          </div>
        ) : null}
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
                  (item.href !== hajiasalPath("/") &&
                    pathname.startsWith(`${item.href}/`));
                const badge =
                  item.badgeKey && badges[item.badgeKey]
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
                      <Icon icon={item.icon} size={17} className="shrink-0 opacity-90" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
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

      <div className="border-t border-[var(--panel-sidebar-border)] p-2.5">
        <button
          type="button"
          onClick={() => void handleLogout()}
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

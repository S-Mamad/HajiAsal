"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/admin/auth/AdminAuthProvider";
import {
  canAccessAdminPath,
  firstAllowedAdminPath,
} from "@/lib/admin/nav";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, role, legacy, authenticated } = useAdminAuth();

  useEffect(() => {
    if (loading || !authenticated) return;
    // Legacy bootstrap sessions are treated as super_admin
    const effectiveRole = legacy ? "super_admin" : role;
    if (!effectiveRole) return;
    if (canAccessAdminPath(effectiveRole, pathname)) return;
    router.replace(firstAllowedAdminPath(effectiveRole));
  }, [loading, authenticated, role, legacy, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        در حال بارگذاری…
      </div>
    );
  }

  const effectiveRole = legacy ? "super_admin" : role;
  if (
    authenticated &&
    effectiveRole &&
    !canAccessAdminPath(effectiveRole, pathname)
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        در حال انتقال…
      </div>
    );
  }

  return <>{children}</>;
}

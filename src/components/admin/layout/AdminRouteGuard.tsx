"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
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
  const effectiveRole = legacy ? "super_admin" : role;
  const allowed =
    !authenticated ||
    !effectiveRole ||
    canAccessAdminPath(effectiveRole, pathname);
  const fallbackHref = firstAllowedAdminPath(effectiveRole);

  useEffect(() => {
    if (loading || !authenticated) return;
    if (!effectiveRole) return;
    if (allowed) return;
    if (pathname === fallbackHref) return;
    router.replace(fallbackHref);
  }, [
    loading,
    authenticated,
    effectiveRole,
    allowed,
    fallbackHref,
    pathname,
    router,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        در حال بارگذاری…
      </div>
    );
  }

  if (authenticated && effectiveRole && !allowed) {
    return (
      <div
        className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
        role="status"
      >
        <p className="text-base font-semibold text-zinc-900">دسترسی ندارید</p>
        <p className="text-sm text-zinc-500">
          این بخش برای نقش شما فعال نیست. اگر فکر می‌کنید اشتباه است، با مدیر
          کل تماس بگیرید.
        </p>
        <Link
          href={fallbackHref}
          className="mt-2 inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

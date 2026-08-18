"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  canAccessSellerPath,
  firstAllowedSellerPath,
} from "@/lib/seller/nav";
import type { SellerCapabilitiesMap } from "@/lib/seller/capabilities";

export function SellerRouteGuard({
  children,
  capabilities,
}: {
  children: ReactNode;
  capabilities?: SellerCapabilitiesMap | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessSellerPath(capabilities, pathname);
  const fallbackHref = firstAllowedSellerPath(capabilities);

  useEffect(() => {
    if (allowed) return;
    if (pathname === fallbackHref) return;
    router.replace(fallbackHref);
  }, [allowed, fallbackHref, pathname, router]);

  if (!allowed) {
    return (
      <div
        className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center"
        role="status"
      >
        <p className="text-base font-semibold text-zinc-900">دسترسی ندارید</p>
        <p className="text-sm text-zinc-500">
          این بخش برای حساب شما فعال نیست. اگر فکر می‌کنید اشتباه است، با
          پشتیبانی تماس بگیرید.
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

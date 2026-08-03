"use client";

import { useEffect, type ReactNode } from "react";
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

  useEffect(() => {
    if (canAccessSellerPath(capabilities, pathname)) return;
    router.replace(firstAllowedSellerPath(capabilities));
  }, [capabilities, pathname, router]);

  if (!canAccessSellerPath(capabilities, pathname)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        در حال انتقال…
      </div>
    );
  }

  return <>{children}</>;
}

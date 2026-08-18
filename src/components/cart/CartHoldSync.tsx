"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/cart";

/**
 * Keeps server soft-holds in sync with the client cart (10-minute TTL).
 * Syncs only when cart lines change — idle time does not renew the hold.
 * After expiry, stock returns for others while items stay in the local cart.
 */
export function CartHoldSync() {
  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const lastPayload = useRef("");

  useEffect(() => {
    if (!hasHydrated) return;

    const payload = JSON.stringify(
      items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
    );
    if (payload === lastPayload.current) return;
    lastPayload.current = payload;

    const body =
      items.length === 0
        ? { items: [], release: true }
        : {
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
            })),
          };
    void fetch("/api/cart/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    }).catch(() => undefined);
  }, [hasHydrated, items]);

  return null;
}

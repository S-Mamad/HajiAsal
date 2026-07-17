import { useWishlistStore } from "@/store/wishlist";

export async function syncWishlistToServer(): Promise<void> {
  const ids = useWishlistStore.getState().ids;
  if (ids.length === 0) return;

  try {
    await fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids, merge: true }),
    });
  } catch {
    // non-blocking sync
  }
}

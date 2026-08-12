import { useWishlistStore } from "@/store/wishlist";

/** Replace server wishlist with local ids (supports removals). */
export async function pushWishlistReplace(): Promise<void> {
  const ids = useWishlistStore.getState().ids;
  try {
    await fetch("/api/account/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: ids, merge: false }),
    });
  } catch {
    // non-blocking sync
  }
}

/** Push local wishlist ids to the authenticated account (merge on first login). */
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

/** Pull server wishlist into local store after login (merge). */
export async function syncWishlistFromServer(): Promise<void> {
  try {
    const res = await fetch("/api/account/wishlist");
    if (!res.ok) return;
    const data = (await res.json()) as { productIds?: string[] };
    const remote = data.productIds ?? [];
    if (remote.length === 0) return;
    const local = useWishlistStore.getState().ids;
    const merged = Array.from(new Set([...local, ...remote]));
    useWishlistStore.setState({ ids: merged });
  } catch {
    // non-blocking sync
  }
}

/** Two-way sync: pull merge, then push replace so removals stick later. */
export async function syncWishlistBidirectional(): Promise<void> {
  await syncWishlistFromServer();
  await pushWishlistReplace();
}

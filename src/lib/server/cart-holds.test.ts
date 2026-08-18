import { beforeEach, describe, expect, it } from "vitest";
import {
  CART_HOLD_TTL_MS,
  expireStaleCartHolds,
  getHeldQtyForProduct,
  syncCartHolds,
} from "./cart-holds";

describe("cart soft holds", () => {
  beforeEach(async () => {
    await syncCartHolds({
      sessionId: "sess-a",
      lines: [],
      stockByProduct: new Map(),
    });
    await syncCartHolds({
      sessionId: "sess-b",
      lines: [],
      stockByProduct: new Map(),
    });
  });

  it("reserves stock for a session without mutating catalog qty", async () => {
    const stock = new Map<string, number | null>([["p1", 5]]);
    const result = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 2 }],
      stockByProduct: stock,
    });
    expect(result.holds[0]?.qty).toBe(2);
    expect(result.expiresAt).toBeTruthy();
    expect(await getHeldQtyForProduct("p1", "sess-a")).toBe(0);
    expect(await getHeldQtyForProduct("p1")).toBe(2);
  });

  it("clamps when others already hold stock", async () => {
    const stock = new Map<string, number | null>([["p1", 3]]);
    await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 2 }],
      stockByProduct: stock,
    });
    const b = await syncCartHolds({
      sessionId: "sess-b",
      lines: [{ productId: "p1", quantity: 3 }],
      stockByProduct: stock,
    });
    expect(b.holds[0]?.qty).toBe(1);
    expect(b.shortages[0]?.held).toBe(1);
  });

  it("expires stale holds", async () => {
    const stock = new Map<string, number | null>([["p1", 5]]);
    const synced = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 1 }],
      stockByProduct: stock,
    });
    expect(synced.holds).toHaveLength(1);
    const dropped = await expireStaleCartHolds(Date.now() + CART_HOLD_TTL_MS + 1000);
    expect(dropped).toBeGreaterThanOrEqual(1);
    expect(await getHeldQtyForProduct("p1")).toBe(0);
  });

  it("does not renew TTL when quantity is unchanged", async () => {
    const stock = new Map<string, number | null>([["p1", 5]]);
    const first = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 2 }],
      stockByProduct: stock,
    });
    const firstExp = first.holds[0]?.expiresAt;
    expect(firstExp).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    const second = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 2 }],
      stockByProduct: stock,
    });
    expect(second.holds[0]?.expiresAt).toBe(firstExp);
  });

  it("renews TTL when quantity increases", async () => {
    const stock = new Map<string, number | null>([["p1", 5]]);
    const first = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 1 }],
      stockByProduct: stock,
    });
    const firstExp = first.holds[0]?.expiresAt ?? 0;
    await new Promise((r) => setTimeout(r, 20));
    const second = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 2 }],
      stockByProduct: stock,
    });
    expect(second.holds[0]?.qty).toBe(2);
    expect(second.holds[0]?.expiresAt ?? 0).toBeGreaterThan(firstExp);
  });

  it("keeps TTL when quantity decreases", async () => {
    const stock = new Map<string, number | null>([["p1", 5]]);
    const first = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 3 }],
      stockByProduct: stock,
    });
    const firstExp = first.holds[0]?.expiresAt;
    await new Promise((r) => setTimeout(r, 20));
    const second = await syncCartHolds({
      sessionId: "sess-a",
      lines: [{ productId: "p1", quantity: 1 }],
      stockByProduct: stock,
    });
    expect(second.holds[0]?.qty).toBe(1);
    expect(second.holds[0]?.expiresAt).toBe(firstExp);
  });
});

import { test, expect } from "@playwright/test";

test.describe("Admin API auth gate", () => {
  test("dashboard API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/admin/dashboard");
    expect([401, 403]).toContain(res.status());
  });

  test("products API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/admin/products");
    expect([401, 403]).toContain(res.status());
  });

  test("orders API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/admin/orders");
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Seller API auth gate", () => {
  test("seller dashboard API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/seller/dashboard");
    expect([401, 403]).toContain(res.status());
  });

  test("seller products API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/seller/products");
    expect([401, 403]).toContain(res.status());
  });

  test("seller orders API rejects unauthenticated", async ({ request }) => {
    const res = await request.get("/api/seller/orders");
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Checkout verify auth", () => {
  test("POST verify without session returns 401", async ({ request }) => {
    const res = await request.post("/api/checkout/verify", {
      data: { authority: "A000", orderId: "ORD-TEST" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Coupons public listing", () => {
  test("GET coupons does not leak discount codes", async ({ request }) => {
    const res = await request.get("/api/coupons");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const list = data.coupons as Array<Record<string, unknown>>;
    for (const row of list ?? []) {
      expect(row).not.toHaveProperty("code");
    }
  });
});

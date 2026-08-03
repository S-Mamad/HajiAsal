import { test, expect } from "@playwright/test";

test.describe.configure({ retries: 1 });

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

const SELLER_UNAUTH_GETS = [
  "/api/seller/dashboard",
  "/api/seller/products",
  "/api/seller/orders",
  "/api/seller/orders/export",
  "/api/seller/inventory",
  "/api/seller/customers",
  "/api/seller/wallet",
  "/api/seller/earnings",
  "/api/seller/reports",
  "/api/seller/tickets",
  "/api/seller/notifications",
  "/api/seller/reviews",
  "/api/seller/qa",
  "/api/seller/discounts",
  "/api/seller/profile",
  "/api/seller/media",
  "/api/seller/tools?mode=template",
  "/api/seller/activity",
  "/api/seller/search?q=test",
  "/api/seller/saved-filters?module=products",
] as const;

test.describe("Seller API auth gate", () => {
  for (const path of SELLER_UNAUTH_GETS) {
    test(`${path} rejects unauthenticated`, async ({ request }) => {
      const res = await request.get(path);
      expect([401, 403]).toContain(res.status());
    });
  }

  test("seller products POST rejects unauthenticated", async ({ request }) => {
    const res = await request.post("/api/seller/products", {
      data: { title: "x" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("seller wallet POST rejects unauthenticated", async ({ request }) => {
    const res = await request.post("/api/seller/wallet", {
      data: { amount: 1000 },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("seller confirm on unpaid order rejects without auth", async ({
    request,
  }) => {
    const res = await request.patch("/api/seller/orders", {
      data: { action: "confirm", orderId: "HA-FAKE-UNPAID" },
    });
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

  test("POST checkout/create without session returns 401", async ({
    request,
  }) => {
    const res = await request.post("/api/checkout/create", {
      data: { orderId: "ORD-TEST" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST snappay/create without session returns 401", async ({
    request,
  }) => {
    const res = await request.post("/api/checkout/snappay/create", {
      data: { orderId: "ORD-TEST" },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("Orders track privacy", () => {
  test("GET track by code alone omits customer PII fields", async ({
    request,
  }) => {
    const res = await request.get("/api/orders?tracking=TRK-DOES-NOT-EXIST");
    // 404 for missing is fine; if found, body must not include customer
    if (res.status() === 404) {
      expect(res.status()).toBe(404);
      return;
    }
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.order).toBeTruthy();
    expect(data.order).not.toHaveProperty("customer");
    expect(data.order).not.toHaveProperty("adminNote");
    expect(data.order).not.toHaveProperty("userId");
  });

  test("GET order by id without session returns 403/401", async ({
    request,
  }) => {
    const res = await request.get("/api/orders?id=HA-FAKE-ORDER");
    expect([401, 403, 404]).toContain(res.status());
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

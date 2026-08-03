import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  makeSeller,
  readJson,
} from "./harness";
import type { SellerOrderView } from "@/lib/server/sellers";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
    getSellerOrders: vi.fn(),
    updateSellerAsync: vi.fn(),
    toPublicSeller: actual.toPublicSeller,
  };
});

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

import { GET as GET_PROFILE, PATCH as PATCH_PROFILE } from "@/app/api/seller/profile/route";
import { GET as GET_CUSTOMERS } from "@/app/api/seller/customers/route";
import {
  getSellerFromRequest,
  getSellerOrders,
  updateSellerAsync,
} from "@/lib/server/sellers";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

function makeOrder(phone: string, name: string): SellerOrderView {
  return {
    id: `o-${phone}`,
    status: "delivered",
    paymentMethod: "online",
    customer: {
      fullName: name,
      phone,
      city: "تهران",
      address: "آدرس",
    },
    sellerItems: [],
    sellerSubtotal: 200_000,
    soleOwner: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("seller profile behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1", shopName: "فروشگاه تست" });
  });

  it("GET returns public seller profile", async () => {
    const res = await GET_PROFILE(
      authedSellerRequest("http://localhost/api/seller/profile"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect((json.seller as { id: string }).id).toBe("s1");
    expect(json.seller).not.toHaveProperty("passwordHash");
  });

  it("PATCH updates profile", async () => {
    const updated = makeSeller({ id: "s1", shopName: "فروشگاه جدید" });
    vi.mocked(updateSellerAsync).mockResolvedValue(updated);
    const res = await PATCH_PROFILE(
      authedSellerRequest("http://localhost/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName: "فروشگاه جدید" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSellerAsync).toHaveBeenCalledWith("s1", {
      shopName: "فروشگاه جدید",
    });
  });

  it("PATCH invalid body returns 400", async () => {
    const res = await PATCH_PROFILE(
      authedSellerRequest("http://localhost/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName: "ا" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("denied without profile.manage", async () => {
    sellerMock.asSellerWithout("profile.manage");
    const res = await GET_PROFILE(
      authedSellerRequest("http://localhost/api/seller/profile"),
    );
    expect(res.status).toBe(403);
  });
});

describe("seller customers behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1" });
  });

  it("GET derives customers from seller orders only", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder("09121110000", "علی"),
      makeOrder("09121110000", "علی"),
      makeOrder("09123330000", "مریم"),
    ]);
    const res = await GET_CUSTOMERS(
      authedSellerRequest("http://localhost/api/seller/customers"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    const customers = json.customers as Array<{ phone: string; orderCount: number }>;
    expect(customers).toHaveLength(2);
    const ali = customers.find((c) => c.phone === "09121110000");
    expect(ali?.orderCount).toBe(2);
    expect(getSellerOrders).toHaveBeenCalledWith("s1");
  });

  it("GET by phone returns 404 when not in seller orders", async () => {
    vi.mocked(getSellerOrders).mockResolvedValue([
      makeOrder("09121110000", "علی"),
    ]);
    const res = await GET_CUSTOMERS(
      authedSellerRequest(
        "http://localhost/api/seller/customers?phone=09129999999",
      ),
    );
    expect(res.status).toBe(404);
  });

  it("denied without customers.view", async () => {
    sellerMock.asSellerWithout("customers.view");
    const res = await GET_CUSTOMERS(
      authedSellerRequest("http://localhost/api/seller/customers"),
    );
    expect(res.status).toBe(403);
  });
});

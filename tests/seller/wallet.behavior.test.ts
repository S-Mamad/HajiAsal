import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
  };
});

vi.mock("@/lib/server/seller-wallet", () => ({
  getSellerWalletBalance: vi.fn(async () => ({
    available: 50_000,
    pending: 0,
    reserved: 0,
  })),
  listSellerLedger: vi.fn(async () => []),
  listWithdrawals: vi.fn(async () => []),
  createWithdrawal: vi.fn(async (input: { amount: number }) => ({
    id: "w1",
    status: "pending",
    amount: input.amount,
  })),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

import { GET, POST } from "@/app/api/seller/wallet/route";
import { getSellerFromRequest } from "@/lib/server/sellers";
import { createWithdrawal } from "@/lib/server/seller-wallet";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

describe("seller wallet behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns balance ledger withdrawals", async () => {
    sellerMock.asSeller({ id: "s1" });
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/wallet"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.balance).toBeTruthy();
    expect(Array.isArray(json.ledger)).toBe(true);
  });

  it("GET denied without wallet.view", async () => {
    sellerMock.asSellerWithout("wallet.view");
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/wallet"),
    );
    expect(res.status).toBe(403);
  });

  it("POST withdraw without sheba returns 400", async () => {
    sellerMock.asSeller({ id: "s1", bankSheba: undefined });
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10_000 }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(String(json.error)).toMatch(/شبا/);
    expect(createWithdrawal).not.toHaveBeenCalled();
  });

  it("POST withdraw with sheba creates request", async () => {
    sellerMock.asSeller({
      id: "s1",
      bankSheba: "IR123456789012345678901234",
    });
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10_000 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(createWithdrawal).toHaveBeenCalled();
    const json = await readJson(res);
    expect(json.success).toBe(true);
  });

  it("POST withdraw denied without wallet.withdraw", async () => {
    sellerMock.asSellerWithout("wallet.withdraw", {
      bankSheba: "IR123456789012345678901234",
    });
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 10_000 }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST invalid amount returns 400", async () => {
    sellerMock.asSeller({
      bankSheba: "IR123456789012345678901234",
    });
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: -1 }),
      }),
    );
    expect(res.status).toBe(400);
  });
});

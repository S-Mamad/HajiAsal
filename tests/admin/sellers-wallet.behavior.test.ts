import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installRequireAdminPermissionMock,
  authedAdminRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    requireAdminPermission: vi.fn(),
  };
});

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  mysqlQueryOne: vi.fn(),
  withMysqlTransaction: vi.fn(),
  toIso: (v: unknown) => String(v),
}));

vi.mock("@/lib/server/products-store", () => ({
  getAllProductsAsync: vi.fn(async () => []),
}));

vi.mock("@/lib/server/sellers-store", () => ({
  getSellerByIdAsync: vi.fn(async () => ({
    id: "seller-a",
    commissionPercent: 10,
  })),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import {
  __resetSellerWalletMemoryForTests,
  addLedgerEntry,
  createWithdrawal,
  getSellerWalletBalance,
  reviewWithdrawal,
} from "@/lib/server/seller-wallet";
import { PATCH as patchWithdrawals } from "@/app/api/admin/sellers/[id]/withdrawals/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

describe("sellers wallet / withdrawals behavior", () => {
  beforeEach(() => {
    __resetSellerWalletMemoryForTests();
    vi.clearAllMocks();
  });

  it("reviewWithdrawal rejects wrong seller ownership", async () => {
    await addLedgerEntry({
      sellerId: "seller-a",
      type: "sale",
      amount: 100_000,
      status: "available",
    });
    const w = await createWithdrawal({
      sellerId: "seller-a",
      amount: 10_000,
      bankSheba: "IR123456789012345678901234",
    });

    const result = await reviewWithdrawal({
      withdrawalId: w.id,
      sellerId: "other-seller",
      status: "approved",
    });
    expect(result).toBeNull();
  });

  it("reviewWithdrawal only succeeds while pending; second call fails", async () => {
    await addLedgerEntry({
      sellerId: "seller-a",
      type: "sale",
      amount: 100_000,
      status: "available",
    });
    const w = await createWithdrawal({
      sellerId: "seller-a",
      amount: 20_000,
      bankSheba: "IR123456789012345678901234",
    });

    const first = await reviewWithdrawal({
      withdrawalId: w.id,
      sellerId: "seller-a",
      status: "approved",
    });
    expect(first?.status).toBe("approved");

    const second = await reviewWithdrawal({
      withdrawalId: w.id,
      sellerId: "seller-a",
      status: "rejected",
    });
    expect(second).toBeNull();
  });

  it("reject releases funds once", async () => {
    await addLedgerEntry({
      sellerId: "seller-a",
      type: "sale",
      amount: 100_000,
      status: "available",
    });
    const w = await createWithdrawal({
      sellerId: "seller-a",
      amount: 30_000,
      bankSheba: "IR123456789012345678901234",
    });
    const before = await getSellerWalletBalance("seller-a");
    expect(before.available).toBe(70_000);

    const reviewed = await reviewWithdrawal({
      withdrawalId: w.id,
      sellerId: "seller-a",
      status: "rejected",
    });
    expect(reviewed?.status).toBe("rejected");

    const after = await getSellerWalletBalance("seller-a");
    expect(after.available).toBe(100_000);

    const again = await reviewWithdrawal({
      withdrawalId: w.id,
      sellerId: "seller-a",
      status: "rejected",
    });
    expect(again).toBeNull();
    const finalBal = await getSellerWalletBalance("seller-a");
    expect(finalBal.available).toBe(100_000);
  });

  it("API returns 404 for wrong sellerId path", async () => {
    await addLedgerEntry({
      sellerId: "seller-a",
      type: "sale",
      amount: 50_000,
      status: "available",
    });
    const w = await createWithdrawal({
      sellerId: "seller-a",
      amount: 5_000,
      bankSheba: "IR123456789012345678901234",
    });

    authMock.asRole("super_admin");
    const res = await patchWithdrawals(
      authedAdminRequest(
        "http://localhost/api/admin/sellers/wrong/withdrawals",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            withdrawalId: w.id,
            status: "approved",
          }),
        },
      ),
      { params: Promise.resolve({ id: "wrong" }) },
    );
    expect(res.status).toBe(404);
    const json = await readJson(res);
    expect(json.error).toBeTruthy();
  });

  it("API returns 400 on invalid body", async () => {
    authMock.asRole("super_admin");
    const res = await patchWithdrawals(
      authedAdminRequest(
        "http://localhost/api/admin/sellers/seller-a/withdrawals",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ withdrawalId: "w1", status: "maybe" }),
        },
      ),
      { params: Promise.resolve({ id: "seller-a" }) },
    );
    expect(res.status).toBe(400);
  });
});

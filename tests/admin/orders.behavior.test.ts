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

vi.mock("@/lib/server/orders", () => ({
  getAllOrders: vi.fn(async () => [{ id: "o1", total: 1, status: "confirmed" }]),
  getOrderById: vi.fn(async () => ({
    id: "o1",
    total: 100_000,
    status: "confirmed",
    paymentMethod: "online",
  })),
  updateOrderAdmin: vi.fn(async (id: string, patch: Record<string, unknown>) => ({
    id,
    total: 100_000,
    status: "confirmed",
    paymentMethod: "online",
    ...patch,
  })),
  updateOrderStatus: vi.fn(async () => ({ id: "o1", status: "confirmed" })),
}));

vi.mock("@/lib/server/newsletter", () => ({
  getContactMessagesBySource: vi.fn(async () => [
    { id: "m1", message: "private", readAt: null },
  ]),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/payment-refund", () => ({
  refundOrderAtGateway: vi.fn(async () => ({
    ok: true,
    provider: "zarinpal",
    message: "ok",
  })),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { getOrderById, updateOrderAdmin } from "@/lib/server/orders";
import { refundOrderAtGateway } from "@/lib/server/payment-refund";
import { GET as listOrders } from "@/app/api/admin/orders/route";
import { PATCH as patchOrder } from "@/app/api/admin/orders/[id]/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

const ctx = { params: Promise.resolve({ id: "o1" }) };

describe("admin orders behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrderById).mockResolvedValue({
      id: "o1",
      total: 100_000,
      status: "confirmed",
      paymentMethod: "online",
    } as Awaited<ReturnType<typeof getOrderById>>);
    vi.mocked(refundOrderAtGateway).mockResolvedValue({
      ok: true,
      provider: "zarinpal",
      message: "ok",
    });
  });

  it("warehouse list does not include contact messages", async () => {
    authMock.asRole("warehouse");
    const res = await listOrders(
      authedAdminRequest("http://localhost/api/admin/orders"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.messages).toEqual([]);
    expect(getContactMessagesBySource).not.toHaveBeenCalled();
  });

  it("support list includes messages", async () => {
    authMock.asRole("support");
    const res = await listOrders(
      authedAdminRequest("http://localhost/api/admin/orders"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect((json.messages as unknown[]).length).toBe(1);
  });

  it("warehouse cannot refund", async () => {
    authMock.asRole("warehouse");
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true }),
      }),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(updateOrderAdmin).not.toHaveBeenCalled();
  });

  it("support can refund via gateway", async () => {
    authMock.asRole("support");
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true }),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(refundOrderAtGateway).toHaveBeenCalled();
    expect(updateOrderAdmin).toHaveBeenCalled();
  });

  it("super_admin can refund", async () => {
    authMock.asRole("super_admin");
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true, refundNote: "ok" }),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(updateOrderAdmin).toHaveBeenCalled();
  });

  it("gateway refund failure does not mark refunded", async () => {
    authMock.asRole("super_admin");
    vi.mocked(refundOrderAtGateway).mockResolvedValue({
      ok: false,
      error: "استرداد زرین‌پال ناموفق بود",
      status: 502,
    });
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true }),
      }),
      ctx,
    );
    expect(res.status).toBe(502);
    expect(updateOrderAdmin).not.toHaveBeenCalled();
  });

  it("manualRefund skips gateway", async () => {
    authMock.asRole("super_admin");
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true, manualRefund: true }),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(refundOrderAtGateway).not.toHaveBeenCalled();
    expect(updateOrderAdmin).toHaveBeenCalled();
  });

  it("already refunded order returns 400", async () => {
    authMock.asRole("super_admin");
    vi.mocked(getOrderById).mockResolvedValue({
      id: "o1",
      total: 100_000,
      status: "cancelled",
      paymentMethod: "online",
      refundedAt: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getOrderById>>);
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund: true }),
      }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(updateOrderAdmin).not.toHaveBeenCalled();
  });

  it("warehouse can edit status without refund", async () => {
    authMock.asRole("warehouse");
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "shipped" }),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("invalid patch body returns 400", async () => {
    authMock.asRole("super_admin");
    const res = await patchOrder(
      authedAdminRequest("http://localhost/api/admin/orders/o1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "not-a-status" }),
      }),
      ctx,
    );
    expect(res.status).toBe(400);
  });
});

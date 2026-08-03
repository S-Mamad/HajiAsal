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

vi.mock("@/lib/server/admin-platform-store", () => ({
  getDashboardStats: vi.fn(async () => ({
    salesToday: 0,
    salesWeek: 0,
    salesMonth: 0,
    customersCount: 0,
    lowStockCount: 0,
    avgOrderValue: 0,
    recentCustomers: [],
    salesChart: [],
    ordersChart: [],
  })),
  listQuestions: vi.fn(async () => []),
  listTickets: vi.fn(async () => []),
}));

vi.mock("@/lib/server/newsletter", () => ({
  getContactMessagesBySource: vi.fn(async () => [
    {
      id: "m1",
      name: "leak",
      email: "a@b.c",
      message: "secret inbox",
      readAt: null,
      createdAt: new Date().toISOString(),
    },
  ]),
}));

vi.mock("@/lib/server/orders", () => ({
  getAllOrders: vi.fn(async () => []),
}));

vi.mock("@/lib/server/products-store", () => ({
  getAllProductsAsync: vi.fn(async () => []),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { GET } from "@/app/api/admin/dashboard/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

describe("admin dashboard behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not leak recentMessages without messages.view (warehouse)", async () => {
    authMock.asRole("warehouse");
    const res = await GET(
      authedAdminRequest("http://localhost/api/admin/dashboard"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.recentMessages).toEqual([]);
    expect((json.kpis as { unreadMessages: number }).unreadMessages).toBe(0);
    expect((json.navBadges as { messages: number }).messages).toBe(0);
    expect(getContactMessagesBySource).not.toHaveBeenCalled();
  });

  it("includes messages for support (has messages.view)", async () => {
    authMock.asRole("support");
    const res = await GET(
      authedAdminRequest("http://localhost/api/admin/dashboard"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(Array.isArray(json.recentMessages)).toBe(true);
    expect((json.recentMessages as unknown[]).length).toBeGreaterThan(0);
    expect((json.kpis as { unreadMessages: number }).unreadMessages).toBe(1);
    expect(getContactMessagesBySource).toHaveBeenCalled();
  });

  it("does not leak messages for content role", async () => {
    authMock.asRole("content");
    const res = await GET(
      authedAdminRequest("http://localhost/api/admin/dashboard"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.recentMessages).toEqual([]);
    expect(getContactMessagesBySource).not.toHaveBeenCalled();
  });
});

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

vi.mock("@/lib/server/products-store", () => ({
  getProductByIdAsync: vi.fn(async () => ({ id: "p1", title: "P" })),
  updateProductAsync: vi.fn(async (_id: string, updates: Record<string, unknown>) => ({
    id: "p1",
    title: "P",
    ...updates,
  })),
  softDeleteProductAsync: vi.fn(async () => true),
  deleteProductAsync: vi.fn(async () => true),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { updateProductAsync } from "@/lib/server/products-store";
import { PATCH, DELETE } from "@/app/api/admin/products/[id]/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

const ctx = { params: Promise.resolve({ id: "p1" }) };

function patchReq(body: unknown) {
  return authedAdminRequest("http://localhost/api/admin/products/p1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin products secondary gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("warehouse can PATCH non-price fields", async () => {
    authMock.asRole("warehouse");
    const res = await PATCH(patchReq({ title: "updated" }), ctx);
    expect(res.status).toBe(200);
    expect(updateProductAsync).toHaveBeenCalled();
  });

  it("warehouse cannot edit weightOptions (edit_price)", async () => {
    authMock.asRole("warehouse");
    const res = await PATCH(
      patchReq({
        weightOptions: [{ label: "1kg", grams: 1000, price: 1000 }],
      }),
      ctx,
    );
    expect(res.status).toBe(403);
    expect(updateProductAsync).not.toHaveBeenCalled();
  });

  it("warehouse cannot edit discountPrice", async () => {
    authMock.asRole("warehouse");
    const res = await PATCH(patchReq({ discountPrice: 500 }), ctx);
    expect(res.status).toBe(403);
  });

  it("warehouse cannot publish (status active)", async () => {
    authMock.asRole("warehouse");
    const res = await PATCH(patchReq({ status: "active" }), ctx);
    expect(res.status).toBe(403);
  });

  it("content cannot edit_price either", async () => {
    authMock.asRole("content");
    const res = await PATCH(patchReq({ discountPrice: 100 }), ctx);
    expect(res.status).toBe(403);
  });

  it("super_admin can edit price and publish", async () => {
    authMock.asRole("super_admin");
    const res = await PATCH(
      patchReq({
        status: "active",
        discountPrice: 900,
        weightOptions: [{ label: "1kg", grams: 1000, price: 1000 }],
      }),
      ctx,
    );
    expect(res.status).toBe(200);
  });

  it("warehouse cannot delete", async () => {
    authMock.asRole("warehouse");
    const res = await DELETE(
      authedAdminRequest("http://localhost/api/admin/products/p1", {
        method: "DELETE",
      }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it("invalid body returns 400", async () => {
    authMock.asRole("super_admin");
    const res = await PATCH(patchReq({ title: "" }), ctx);
    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(json.error).toBeTruthy();
  });
});

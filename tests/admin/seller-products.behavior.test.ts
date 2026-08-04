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
  getProductByIdAsync: vi.fn(),
  setProductApprovalAsync: vi.fn(),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import {
  getProductByIdAsync,
  setProductApprovalAsync,
} from "@/lib/server/products-store";
import { PATCH } from "@/app/api/admin/seller-products/[id]/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

const ctx = { params: Promise.resolve({ id: "p1" }) };

function patchReq(body: unknown) {
  return authedAdminRequest("http://localhost/api/admin/seller-products/p1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin seller product approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.asRole("super_admin");
  });

  it("blocks approving unsubmitted draft", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      sellerId: "s1",
      approvalStatus: "pending",
      title: "draft",
    } as never);
    const res = await PATCH(patchReq({ approvalStatus: "approved" }), ctx);
    expect(res.status).toBe(400);
    expect(setProductApprovalAsync).not.toHaveBeenCalled();
    const json = await readJson(res);
    expect(String(json.error)).toContain("ارسال");
  });

  it("blocks approving rejected product until resubmit", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      sellerId: "s1",
      approvalStatus: "rejected",
      submittedAt: undefined,
      title: "rejected",
    } as never);
    const res = await PATCH(patchReq({ approvalStatus: "approved" }), ctx);
    expect(res.status).toBe(400);
    expect(setProductApprovalAsync).not.toHaveBeenCalled();
  });

  it("approves submitted pending product", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      sellerId: "s1",
      approvalStatus: "pending",
      submittedAt: "2026-01-01T00:00:00.000Z",
      title: "ready",
    } as never);
    vi.mocked(setProductApprovalAsync).mockResolvedValue({
      id: "p1",
      approvalStatus: "approved",
      status: "active",
    } as never);
    const res = await PATCH(patchReq({ approvalStatus: "approved" }), ctx);
    expect(res.status).toBe(200);
    expect(setProductApprovalAsync).toHaveBeenCalledWith(
      "p1",
      "approved",
      undefined,
    );
  });

  it("passes reviewNote on reject", async () => {
    vi.mocked(getProductByIdAsync).mockResolvedValue({
      id: "p1",
      sellerId: "s1",
      approvalStatus: "pending",
      submittedAt: "2026-01-01T00:00:00.000Z",
      title: "ready",
    } as never);
    vi.mocked(setProductApprovalAsync).mockResolvedValue({
      id: "p1",
      approvalStatus: "rejected",
      status: "draft",
    } as never);
    const res = await PATCH(
      patchReq({ approvalStatus: "rejected", reviewNote: "قیمت نامعتبر" }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(setProductApprovalAsync).toHaveBeenCalledWith(
      "p1",
      "rejected",
      "قیمت نامعتبر",
    );
  });
});

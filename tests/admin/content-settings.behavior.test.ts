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

vi.mock("@/lib/server/site-settings", () => ({
  getSiteSettings: vi.fn(async () => ({
    shippingCost: 50000,
    hero: { title: "H" },
  })),
  updateSiteSettings: vi.fn(async (patch: Record<string, unknown>) => ({
    shippingCost: 50000,
    hero: { title: "H" },
    ...patch,
  })),
}));

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  mysqlQuery: vi.fn(),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { updateSiteSettings } from "@/lib/server/site-settings";
import { PATCH as patchContent } from "@/app/api/admin/content/route";
import { PATCH as patchSettings } from "@/app/api/admin/settings/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

describe("content vs settings allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("content PATCH rejects shippingCost (strict allowlist)", async () => {
    authMock.asRole("content");
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: 1000 }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(String(json.error)).toMatch(/محتوا/);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("content PATCH accepts hero fields", async () => {
    authMock.asRole("content");
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero: { title: "New" } }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalledWith({
      hero: { title: "New" },
    });
  });

  it("settings PATCH accepts shippingCost for super_admin", async () => {
    authMock.asRole("super_admin");
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: 12000 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalledWith({ shippingCost: 12000 });
  });

  it("content role cannot PATCH settings", async () => {
    authMock.asRole("content");
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: 1 }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("settings PATCH rejects negative shippingCost", async () => {
    authMock.asRole("super_admin");
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: -1 }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
